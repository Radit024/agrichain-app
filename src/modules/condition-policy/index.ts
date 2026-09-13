import type { ConditionStatus, DataQualityStatus, ParameterCode } from "../shared-types";
import type { PPM } from "../fixed-point";
import type { ParameterRule, MonitoringProfile } from "../monitoring-profile";

/**
 * Policy engine kondisi (IMPLEMENTATION-PLAN §3.2) — murni, tanpa I/O.
 *
 * Aturan (dari plan + K4/K5):
 * 1. Parameter wajib hilang / device OFFLINE/STALE / pembacaan stale
 *    → dataQualityStatus = DATA_UNAVAILABLE (tidak pernah "COMPLIANT" diam-diam).
 * 2. Batas numerik INKLUSIF; nilai tepat min/max → reason AT_BOUNDARY (tetap dalam batas).
 * 3. Pelanggaran rule CRITICAL:
 *    - durasi < toleranceSeconds → STILL_IN_TOLERANCE (COMPLIANT)
 *    - durasi ≥ toleranceSeconds (atau tolerance=0) → OUT_OF_RANGE (AT_RISK)
 * 4. Pelanggaran yang pulih sebelum toleransi habis → WITHIN_TOLERANCE (COMPLIANT).
 * 5. COLD_CHAIN + coolingState FAULT → AT_RISK (COOLING_FAULT).
 * 6. DOOR_OPEN dan rule WARNING/CONTEXT → alert operasional, tidak AT_RISK.
 * Status kondisi AT_RISK hanya dari rule CRITICAL + cooling fault cold chain.
 */

export interface ConditionReading {
  values: Partial<Record<ParameterCode, PPM>>;
  doorState?: "OPEN" | "CLOSED";
  coolingState?: "ON" | "OFF" | "FAULT";
  checkpointId?: string;
  deviceHealth: "ONLINE" | "STALE" | "OFFLINE";
  source: "SIMULATOR";
  at: Date;
}

export interface ConditionEvaluation {
  conditionStatus: ConditionStatus;
  dataQualityStatus: DataQualityStatus;
  reasons: string[];
  violatedParameters: ParameterCode[];
  operationalAlerts: string[];
  evaluatedAt: Date;
}

type NumericalRule = ParameterRule & { code: ParameterCode };

export function evaluateCondition(
  profile: MonitoringProfile,
  readings: ConditionReading[],
  now: Date = new Date(),
): ConditionEvaluation {
  if (readings.length === 0) throw new Error("EMPTY_READINGS");
  for (let i = 1; i < readings.length; i++) {
    if (readings[i].at < readings[i - 1].at) throw new Error("READINGS_UNORDERED");
  }

  const latest = readings[readings.length - 1];
  const reasons: string[] = [];
  const alerts: string[] = [];
  const violated: ParameterCode[] = [];
  let atRisk = false;
  let sawBoundary = false;

  // ---------- 1. Kualitas data ----------
  let dataQuality: DataQualityStatus = "AVAILABLE";
  if (latest.deviceHealth === "OFFLINE") {
    dataQuality = "DATA_UNAVAILABLE";
    reasons.push("DEVICE_OFFLINE");
  } else if (latest.deviceHealth === "STALE") {
    dataQuality = "DATA_UNAVAILABLE";
    reasons.push("DEVICE_STALE");
  } else {
    const ageSec = (now.getTime() - latest.at.getTime()) / 1000;
    if (ageSec > profile.staleAfterSeconds) {
      dataQuality = "DATA_UNAVAILABLE";
      reasons.push("READING_STALE");
    }
  }
  for (const rule of profile.rules) {
    if (rule.required && latest.values[rule.code] === undefined) {
      dataQuality = "DATA_UNAVAILABLE";
      reasons.push(`REQUIRED_PARAM_MISSING:${rule.code}`);
    }
  }

  // ---------- 2. Alert operasional ----------
  if (latest.doorState === "OPEN") alerts.push("DOOR_OPEN");
  if (latest.coolingState === "FAULT") {
    alerts.push("COOLING_FAULT");
    if (profile.handlingMode === "COLD_CHAIN") {
      atRisk = true;
      reasons.push("COOLING_FAULT");
    }
  }

  // ---------- 3. Evaluasi numerik per rule ----------
  for (const rule of profile.rules as NumericalRule[]) {
    const value = latest.values[rule.code];
    if (value === undefined) continue;

    const inBounds =
      (rule.min === undefined || value >= rule.min) &&
      (rule.max === undefined || value <= rule.max);

    if (inBounds) {
      if (value === rule.min || value === rule.max) sawBoundary = true;
      continue;
    }

    // di luar batas → hitung durasi pelanggaran beruntun hingga pembacaan terakhir
    const durationSec = currentViolationDurationSec(readings, rule, latest);
    const tolerance = rule.toleranceSeconds ?? 0;

    if (rule.severity === "CRITICAL") {
      if (!violated.includes(rule.code)) violated.push(rule.code);
      if (tolerance === 0 || durationSec >= tolerance) {
        atRisk = true;
      }
    } else {
      alerts.push(`${rule.severity}_${rule.code}`);
    }
  }

  // ---------- 4. Status & reason final ----------
  const status: ConditionStatus = atRisk ? "AT_RISK" : "COMPLIANT";

  if (atRisk) {
    reasons.unshift("OUT_OF_RANGE");
  } else if (violated.length > 0) {
    // pelanggaran CRITICAL aktif tapi masih dalam toleransi
    reasons.unshift("STILL_IN_TOLERANCE");
  } else if (recoveredWithinTolerance(readings, profile)) {
    reasons.unshift("WITHIN_TOLERANCE");
  } else if (sawBoundary) {
    reasons.unshift("AT_BOUNDARY");
  } else {
    reasons.unshift("WITHIN_RANGE");
  }

  return {
    conditionStatus: status,
    dataQualityStatus: dataQuality,
    reasons,
    violatedParameters: atRisk || violated.length > 0 ? violated : [],
    operationalAlerts: alerts,
    evaluatedAt: now,
  };
}

/** Durasi pelanggaran beruntun untuk satu rule, dihitung mundur dari pembacaan terakhir. */
function currentViolationDurationSec(
  readings: ConditionReading[],
  rule: ParameterRule,
  latest: ConditionReading,
): number {
  const inBounds = (v: PPM) =>
    (rule.min === undefined || v >= rule.min) && (rule.max === undefined || v <= rule.max);

  let start = latest.at; // default: pelanggaran baru saja dimulai
  for (let i = readings.length - 1; i >= 0; i--) {
    const v = readings[i].values[rule.code];
    if (v === undefined) continue;
    if (inBounds(v)) break; // berhenti di pembacaan terakhir yang masih dalam batas
    start = readings[i].at;
  }
  return Math.max(0, (latest.at.getTime() - start.getTime()) / 1000);
}

/**
 * Deteksi "pulih dalam toleransi": ada episode pelanggaran CRITICAL di riwayat
 * yang berakhir dengan pulih DAN durasinya < toleranceSeconds, dan pembacaan
 * terakhir valid.
 */
function recoveredWithinTolerance(
  readings: ConditionReading[],
  profile: MonitoringProfile,
): boolean {
  if (readings.length < 2) return false;
  const latest = readings[readings.length - 1];

  for (const rule of profile.rules) {
    if (rule.severity !== "CRITICAL") continue;
    const inBounds = (v: PPM) =>
      (rule.min === undefined || v >= rule.min) && (rule.max === undefined || v <= rule.max);

    const latestVal = latest.values[rule.code];
    if (latestVal === undefined || !inBounds(latestVal)) continue;

    // berjalan mundur: episode pelanggaran terakhir sebelum pulih
    let end: Date | null = null;
    let start: Date | null = null;
    for (let i = readings.length - 1; i >= 0; i--) {
      const v = readings[i].values[rule.code];
      if (v === undefined) continue;
      if (!inBounds(v)) {
        start = readings[i].at;
        if (end === null) end = latest.at; // pelanggaran bersinggungan dgn latest valid? tidak — latest valid
      } else if (start !== null) {
        break; // mulai pulih di sini
      }
    }
    if (start !== null && end === null) {
      // pelanggaran tepat sebelum pembacaan valid terakhir
      end = latest.at;
    }
    if (start !== null && end !== null) {
      const durationSec = (end.getTime() - start.getTime()) / 1000;
      const tolerance = rule.toleranceSeconds ?? 0;
      if (durationSec < tolerance) return true;
    }
  }
  return false;
}
