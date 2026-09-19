import {
  generateColdChainReading,
  type ScenarioName,
  type SimulatorReadingPayload,
} from "./scenarios/cold-chain.ts";
import {
  generateNonColdChainReading,
  type NonColdScenarioName,
} from "./scenarios/non-cold-chain.ts";
import type { HandlingMode } from "../../modules/shared-types";

const COLD_CHAIN_SCENARIOS: ScenarioName[] = [
  "NORMAL",
  "NORMAL",
  "AT_BOUNDARY",
  "NORMAL",
  "DOOR_OPEN",
  "NORMAL",
  "COOLING_FAILURE",
  "RECOVERY",
  "NORMAL",
  "SENSOR_OFFLINE",
];

const NON_COLD_CHAIN_SCENARIOS: NonColdScenarioName[] = [
  "NORMAL",
  "NORMAL",
  "HIGH_HUMIDITY",
  "NORMAL",
  "SHOCK_EVENT",
  "NORMAL",
  "ROUTE_DELAY",
  "NORMAL",
  "SENSOR_OFFLINE",
];

export async function processBatch(
  batchId: string,
  handlingMode: HandlingMode,
  runIndex: number,
  now: Date = new Date(),
) {
  let readingPayload: SimulatorReadingPayload;

  if (handlingMode === "COLD_CHAIN") {
    const scenario = COLD_CHAIN_SCENARIOS[runIndex % COLD_CHAIN_SCENARIOS.length];
    readingPayload = generateColdChainReading(batchId, scenario, runIndex, now);
  } else {
    const scenario = NON_COLD_CHAIN_SCENARIOS[runIndex % NON_COLD_CHAIN_SCENARIOS.length];
    readingPayload = generateNonColdChainReading(batchId, scenario, runIndex, now);
  }

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const ingestUrl = process.env.SIMULATOR_INGEST_URL ?? `${baseUrl}/api/internal/simulator/ingest`;
  const apiKey =
    process.env.INTERNAL_API_KEY || process.env.SIMULATOR_API_KEY || "agrichain-simulator-dev-key";

  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-key": apiKey,
    },
    body: JSON.stringify(readingPayload),
  });

  if (!response.ok) {
    throw new Error(`Ingest failed with status: ${response.status} ${await response.text()}`);
  }

  return readingPayload;
}
