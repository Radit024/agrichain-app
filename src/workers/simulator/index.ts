import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { processBatch } from "./runner.ts";
import type { HandlingMode } from "../../modules/shared-types";

interface BatchItem {
  id: string;
  distribution_status: string;
  paused: boolean;
  profile_snapshot: { handlingMode?: HandlingMode } | null;
}

// Keep track of runIndex per batch in memory for simplicity
const runIndices: Record<string, number> = {};

async function fetchActiveBatches(): Promise<BatchItem[]> {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const apiKey =
    process.env.INTERNAL_API_KEY || process.env.SIMULATOR_API_KEY || "agrichain-simulator-dev-key";
  const batchesUrl = `${baseUrl}/api/internal/simulator/batches`;

  try {
    const res = await fetch(batchesUrl, {
      headers: { "x-internal-api-key": apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      return (data.batches as BatchItem[]) ?? [];
    }
  } catch {
    // Dev server Next.js mungkin belum aktif
  }

  // Fallback: langsung via Supabase jika env Supabase tersedia
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (process.env.SUPABASE_URL && supabaseKey) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
      const { data, error } = await supabase
        .from("batches")
        .select("id, distribution_status, paused, profile_snapshot")
        .neq("distribution_status", "SELESAI")
        .eq("paused", false);

      if (!error && data) {
        return data as unknown as BatchItem[];
      }
    } catch {
      // Abaikan jika Supabase tidak dapat dihubungi
    }
  }

  return [];
}

async function runSimulator() {
  console.log(`[Simulator] Run started at ${new Date().toISOString()}`);
  try {
    const batches = await fetchActiveBatches();

    if (!batches || batches.length === 0) {
      console.log(
        "[Simulator] Tidak ada batch aktif atau server Next.js (http://localhost:3000) belum menyala. Pastikan 'npm run dev' berjalan.",
      );
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
          `[Simulator] Batch ${batch.id} diproses. Skenario: ${payload.scenario}. Result: OK`,
        );
      } catch (err) {
        console.error(`[Simulator] Batch ${batch.id} gagal:`, err);
      }
    }
  } catch (err) {
    console.error("[Simulator] Critical error:", err);
  }
}

const intervalSecs = parseInt(process.env.SIMULATOR_INTERVAL_SECONDS || "60", 10);
const cronExp = `*/${intervalSecs} * * * * *`;

console.log(`[Simulator] Starting with interval ${intervalSecs} seconds...`);
// Jalankan sekali saat startup, lalu jadwalkan dengan cron
runSimulator().catch(console.error);

cron.schedule(cronExp, () => {
  runSimulator().catch(console.error);
});
