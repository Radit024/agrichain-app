import type { ParameterCode } from "../../../modules/shared-types";
import { computeSeed, seededFloat } from "../seed.ts";

export type ScenarioName =
  "NORMAL" | "AT_BOUNDARY" | "DOOR_OPEN" | "COOLING_FAILURE" | "RECOVERY" | "SENSOR_OFFLINE";

export interface SimulatorReadingPayload {
  batchId: string;
  readAt: string;
  deviceHealth: "ONLINE" | "OFFLINE" | "STALE";
  scenario: string;
  seed: number;
  measurements: { code: ParameterCode | string; valuePPM: number }[];
  doorState?: "OPEN" | "CLOSED";
  coolingState?: "ON" | "OFF" | "FAULT";
}

export function generateColdChainReading(
  batchId: string,
  scenario: ScenarioName,
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
    doorState: "CLOSED",
    coolingState: "ON",
  };

  if (scenario === "SENSOR_OFFLINE") {
    result.deviceHealth = "OFFLINE";
    return result;
  }

  // Baseline Temperature (2-4 C)
  let tempValue = seededFloat(seed, 2_000_000, 4_000_000);

  if (scenario === "AT_BOUNDARY") {
    tempValue = 4_000_000;
  } else if (scenario === "DOOR_OPEN") {
    tempValue = seededFloat(seed, 4_000_000, 5_500_000);
    result.doorState = "OPEN";
  } else if (scenario === "COOLING_FAILURE") {
    tempValue = seededFloat(seed, 10_000_000, 15_000_000);
    result.coolingState = "FAULT";
  } else if (scenario === "RECOVERY") {
    tempValue = seededFloat(seed, 2_000_000, 4_000_000);
    result.coolingState = "ON";
  }

  result.measurements.push({
    code: "TEMPERATURE",
    valuePPM: Math.round(tempValue),
  });

  return result;
}
