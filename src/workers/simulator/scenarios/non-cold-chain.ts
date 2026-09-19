import type { ParameterCode } from "../../../modules/shared-types";
import { computeSeed, seededFloat } from "../seed.ts";
import type { SimulatorReadingPayload } from "./cold-chain.ts";

export type NonColdScenarioName =
  "NORMAL" | "HIGH_HUMIDITY" | "SHOCK_EVENT" | "ROUTE_DELAY" | "SENSOR_OFFLINE";

export function generateNonColdChainReading(
  batchId: string,
  scenario: NonColdScenarioName,
  runIndex: number,
  now: Date,
): SimulatorReadingPayload {
  const seed = computeSeed(batchId, scenario, runIndex);
  const result: SimulatorReadingPayload = {
    batchId,
    readAt: now.toISOString(),
    deviceHealth: "ONLINE" as const,
    scenario,
    seed,
    measurements: [] as { code: ParameterCode | string; valuePPM: number }[],
  };

  if (scenario === "SENSOR_OFFLINE") {
    result.deviceHealth = "OFFLINE";
    return result;
  }

  // Baseline Humidity (40-60 %)
  let humidityValue = seededFloat(seed, 40_000_000, 60_000_000);

  if (scenario === "HIGH_HUMIDITY") {
    humidityValue = seededFloat(seed, 65_000_000, 80_000_000);
  }

  result.measurements.push({
    code: "HUMIDITY",
    valuePPM: Math.round(humidityValue),
  });

  if (scenario === "SHOCK_EVENT") {
    const shockValue = seededFloat(seed, 600_000, 1_000_000); // 0.6g - 1.0g
    result.measurements.push({
      code: "SHOCK_LEVEL",
      valuePPM: Math.round(shockValue),
    });
  }

  return result;
}
