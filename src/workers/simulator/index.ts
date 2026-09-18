import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { processBatch } from "./runner";
import type { HandlingMode } from "../../modules/shared-types";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// We'll keep track of runIndex per batch in memory for simplicity
const runIndices: Record<string, number> = {};

async function runSimulator() {
  console.log(`[Simulator] Run started at ${new Date().toISOString()}`);
  try {
    const { data: batches, error } = await supabase
      .from("batches")
      .select("id, distribution_status, paused, profile_snapshot")
      .neq("distribution_status", "SELESAI")
      .eq("paused", false);

    if (error) {
      console.error(`[Simulator] Failed to fetch batches: ${error.message}`);
      return;
    }

    if (!batches || batches.length === 0) {
      console.log("[Simulator] No active batches to process.");
      return;
    }

    const now = new Date();
    for (const batch of batches) {
      if (!batch.profile_snapshot) continue;

      const profile = batch.profile_snapshot as { handlingMode?: HandlingMode };
      const handlingMode = (profile.handlingMode ?? "NON_COLD_CHAIN") as HandlingMode;

      const idx = runIndices[batch.id] || 0;
      runIndices[batch.id] = idx + 1;

      try {
        const payload = await processBatch(batch.id, handlingMode, idx, now);
        console.log(
          `[Simulator] Batch ${batch.id} processed. Scenario: ${payload.scenario}. Result: OK`,
        );
      } catch (err) {
        console.error(`[Simulator] Batch ${batch.id} failed:`, err);
      }
    }
  } catch (err) {
    console.error("[Simulator] Critical error:", err);
  }
}

const intervalSecs = parseInt(process.env.SIMULATOR_INTERVAL_SECONDS || "60", 10);
const cronExp = `*/${intervalSecs} * * * * *`;

console.log(`[Simulator] Starting with interval ${intervalSecs} seconds...`);
cron.schedule(cronExp, () => {
  runSimulator().catch(console.error);
});
