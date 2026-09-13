import type { PPM } from "../fixed-point";

/** Rule parameter monitoring (dinamis per profil — K12). */
export interface ParameterRule {
  code: import("../shared-types").ParameterCode;
  unit: string;
  required: boolean;
  min?: PPM;
  max?: PPM;
  toleranceSeconds?: number;
  severity: "CRITICAL" | "WARNING" | "CONTEXT";
}

export interface MonitoringProfile {
  handlingMode: import("../shared-types").HandlingMode;
  version: number;
  rules: ParameterRule[];
  staleAfterSeconds: number;
}

/**
 * Validasi struktur profil (server action / seed memakai ini sebelum menyimpan).
 * COLD_CHAIN wajib punya rule TEMPERATURE (plan §3.2).
 */
export function validateMonitoringProfile(profile: MonitoringProfile): string[] {
  const errors: string[] = [];
  const codes = new Set(profile.rules.map((r) => r.code));
  if (codes.size !== profile.rules.length) {
    errors.push("DUPLICATE_PARAMETER_CODE");
  }
  if (profile.handlingMode === "COLD_CHAIN" && !codes.has("TEMPERATURE")) {
    errors.push("COLD_CHAIN_REQUIRES_TEMPERATURE");
  }
  for (const r of profile.rules) {
    if (r.min !== undefined && r.max !== undefined && r.min > r.max) {
      errors.push(`MIN_GT_MAX:${r.code}`);
    }
    if (r.severity === "CRITICAL" && r.min === undefined && r.max === undefined) {
      errors.push(`CRITICAL_WITHOUT_BOUNDS:${r.code}`);
    }
    if ((r.toleranceSeconds ?? 0) < 0 || profile.staleAfterSeconds <= 0) {
      errors.push("INVALID_TOLERANCE_OR_STALE");
    }
  }
  return errors;
}
