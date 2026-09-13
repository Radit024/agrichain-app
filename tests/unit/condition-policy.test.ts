import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateCondition, type ConditionReading } from "@/modules/condition-policy";
import type { MonitoringProfile } from "@/modules/monitoring-profile";
import type { ParameterCode } from "@/modules/shared-types";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(
  readFileSync(path.resolve(HERE, "../../src/modules/test-vectors/condition-cases.json"), "utf8"),
);

function profileFromVector(
  v: typeof vectors.profile,
  override?: typeof vectors.$,
): MonitoringProfile {
  const rules = (override ?? vectors.profile).rules.map((r: Record<string, unknown>) => ({
    code: r.code as ParameterCode,
    unit: r.unit as string,
    required: Boolean(r.required),
    min: (r.minPPM as number | undefined) !== undefined ? BigInt(r.minPPM as number) : undefined,
    max: (r.maxPPM as number | undefined) !== undefined ? BigInt(r.maxPPM as number) : undefined,
    toleranceSeconds: r.toleranceSeconds as number | undefined,
    severity: r.severity as "CRITICAL" | "WARNING" | "CONTEXT",
  }));
  return {
    handlingMode: (override ?? vectors.profile).handlingMode ?? vectors.profile.handlingMode,
    version: vectors.profile.version,
    staleAfterSeconds: vectors.profile.staleAfterSeconds,
    rules,
  };
}

/** t (menit) → Date tetap relatif terhadap "now" uji. */
const BASE = new Date("2026-09-13T10:00:00Z");

interface VectorCase {
  id: string;
  profileOverride?: { rules: Array<Record<string, unknown>> };
  readings: Array<{
    t: number;
    values: Record<string, number>;
    deviceHealth?: string;
    doorState?: string;
    coolingState?: string;
  }>;
  expect: {
    conditionStatus: string;
    dataQualityStatus: string;
    reasons: string[];
    violatedParameters?: string[];
    operationalAlerts?: string[];
  };
}

describe("condition-policy: seluruh kasus test-vectors (§3.2 + §3.6)", () => {
  for (const c of vectors.cases as VectorCase[]) {
    it(`kasus ${c.id}`, () => {
      const profile = c.profileOverride
        ? profileFromVector(undefined, {
            ...vectors.profile,
            rules: c.profileOverride.rules,
          })
        : profileFromVector(vectors.profile);

      const readings: ConditionReading[] = c.readings.map((r) => ({
        values: Object.fromEntries(
          Object.entries(r.values ?? {}).map(([k, v]) => [k, BigInt(v as number)]),
        ) as Partial<Record<ParameterCode, bigint>>,
        deviceHealth: r.deviceHealth ?? "ONLINE",
        doorState: r.doorState,
        coolingState: r.coolingState,
        source: "SIMULATOR",
        at: new Date(BASE.getTime() + (r.t as number) * 60_000),
      }));

      const result = evaluateCondition(
        profile,
        readings,
        new Date(BASE.getTime() + 11 * 60_000), // now = 11 menit setelah awal
      );

      expect(result.conditionStatus).toBe(c.expect.conditionStatus);
      expect(result.dataQualityStatus).toBe(c.expect.dataQualityStatus);
      for (const reason of c.expect.reasons as string[]) {
        // reason param-spesifik (AT_BOUNDARY:TEMPERATURE) dicocokkan awalan
        const plain = reason.split(":")[0];
        expect(
          result.reasons.some((x) => x === reason || x.startsWith(`${plain}:`) || x === plain),
        ).toBe(true);
      }
      if (c.expect.violatedParameters) {
        expect(result.violatedParameters.sort()).toEqual(
          [...(c.expect.violatedParameters as string[])].sort(),
        );
      }
      if (c.expect.operationalAlerts) {
        expect(result.operationalAlerts).toEqual(c.expect.operationalAlerts);
      }
    });
  }
});

describe("condition-policy: error input", () => {
  it("pembacaan kosong → EMPTY_READINGS", () => {
    const profile = profileFromVector(vectors.profile);
    expect(() => evaluateCondition(profile, [])).toThrow(/EMPTY_READINGS/);
  });

  it("pembacaan tidak urut → READINGS_UNORDERED", () => {
    const profile = profileFromVector(vectors.profile);
    const r1 = {
      values: { TEMPERATURE: 4_000_000n },
      deviceHealth: "ONLINE" as const,
      source: "SIMULATOR" as const,
      at: new Date(BASE.getTime() + 60_000),
    };
    const r0 = {
      values: { TEMPERATURE: 4_000_000n },
      deviceHealth: "ONLINE" as const,
      source: "SIMULATOR" as const,
      at: new Date(BASE.getTime()),
    };
    expect(() => evaluateCondition(profile, [r1, r0])).toThrow(/READINGS_UNORDERED/);
  });
});
