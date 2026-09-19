import { NextResponse } from "next/server";
import { z } from "zod";
import { getDbAdapter } from "@/server/db/adapter";
import { evaluateCondition, type ConditionReading } from "@/modules/condition-policy";
import type { ParameterCode } from "@/modules/shared-types";
import type { MonitoringProfile } from "@/modules/monitoring-profile";

export const runtime = "nodejs";

const IngestSchema = z.object({
  batchId: z.string().uuid(),
  readAt: z.string().datetime(),
  deviceHealth: z.enum(["ONLINE", "OFFLINE", "STALE"]),
  scenario: z.string(),
  seed: z.number(),
  doorState: z.enum(["OPEN", "CLOSED"]).optional(),
  coolingState: z.enum(["ON", "OFF", "FAULT"]).optional(),
  measurements: z.array(
    z.object({
      code: z.string(),
      valuePPM: z.number(),
    }),
  ),
});

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-internal-api-key") || req.headers.get("x-simulator-key");
    const expectedKey =
      process.env.INTERNAL_API_KEY ||
      process.env.SIMULATOR_API_KEY ||
      "agrichain-simulator-dev-key";

    if (apiKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload = IngestSchema.parse(body);

    const db = await getDbAdapter();

    // 1. Ambil profile snapshot dari batch
    const batches = await db.query<{ profile_snapshot: unknown }>(
      "select profile_snapshot from batches where id = $1",
      [payload.batchId],
    );

    if (batches.length === 0 || !batches[0].profile_snapshot) {
      return NextResponse.json({ error: "Batch not found or missing profile" }, { status: 404 });
    }

    const profile = batches[0].profile_snapshot as unknown as MonitoringProfile;

    // 2. Simpan reading ke condition_readings (idempoten per batch, waktu, skenario, dan seed)
    const idempotencyKey = `sim:${payload.batchId}:${payload.readAt}:${payload.seed}`;
    const readingRows = await db.query<{ id: string }>(
      `insert into condition_readings (
         batch_id, source, scenario, idempotency_key, door_state, cooling_state, device_health, read_at
       )
       values ($1, 'SIMULATOR', $2, $3, $4, $5, $6, $7)
       on conflict (idempotency_key) do update set read_at = excluded.read_at
       returning id`,
      [
        payload.batchId,
        payload.scenario,
        idempotencyKey,
        payload.doorState ?? null,
        payload.coolingState ?? null,
        payload.deviceHealth,
        payload.readAt,
      ],
    );

    if (readingRows.length === 0) {
      return NextResponse.json({ error: "Failed to insert reading" }, { status: 500 });
    }

    const readingId = readingRows[0].id;

    // 3. Simpan measurements ke condition_measurements
    if (payload.measurements && payload.measurements.length > 0) {
      for (const m of payload.measurements) {
        await db.query(
          `insert into condition_measurements (reading_id, parameter_code, value_ppm)
           values ($1, $2, $3)
           on conflict (reading_id, parameter_code) do update set value_ppm = excluded.value_ppm`,
          [readingId, m.code, Math.round(m.valuePPM)],
        );
      }
    }

    // 4. Ambil 10 pembacaan terakhir untuk evaluasi policy
    const historyRows = await db.query<{
      id: string;
      read_at: string;
      device_health: string;
      door_state: string | null;
      cooling_state: string | null;
    }>(
      `select id, read_at, device_health, door_state, cooling_state
       from condition_readings
       where batch_id = $1
       order by read_at desc
       limit 10`,
      [payload.batchId],
    );

    const readingIds = historyRows.map((r) => r.id);
    let measurementRows: Array<{
      reading_id: string;
      parameter_code: string;
      value_ppm: string | number;
    }> = [];

    if (readingIds.length > 0) {
      // Mengambil pengukuran untuk pembacaan terkait
      measurementRows = await db.query(
        `select reading_id, parameter_code, value_ppm
         from condition_measurements
         where reading_id = any($1::uuid[])`,
        [readingIds],
      );
    }

    // Urutkan kronologis (terlama ke terbaru) untuk evaluasi
    const historyReadings: ConditionReading[] = historyRows
      .map((r) => {
        const values: Partial<Record<ParameterCode, number>> = {};
        const meas = measurementRows.filter((m) => m.reading_id === r.id);
        for (const m of meas) {
          values[m.parameter_code as ParameterCode] = Number(m.value_ppm);
        }
        return {
          values,
          deviceHealth: r.device_health,
          source: "SIMULATOR",
          at: new Date(r.read_at),
          doorState: r.door_state ?? undefined,
          coolingState: r.cooling_state ?? undefined,
        } as ConditionReading;
      })
      .reverse();

    // 5. Jalankan evaluasi kondisi
    const now = new Date(payload.readAt);
    const evaluation = evaluateCondition(profile, historyReadings, now);

    // 6. Simpan hasil evaluasi ke condition_evaluations
    await db.query(
      `insert into condition_evaluations (
         batch_id, reading_id, condition_status, data_quality_status, reasons, operational_alerts, created_at
       )
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
      [
        payload.batchId,
        readingId,
        evaluation.conditionStatus,
        evaluation.dataQualityStatus,
        JSON.stringify(evaluation.reasons),
        JSON.stringify(evaluation.operationalAlerts),
        evaluation.evaluatedAt.toISOString(),
      ],
    );

    // 7. Update status pada tabel batches
    await db.query(
      `update batches
       set condition_status = $2, data_quality_status = $3, updated_at = $4
       where id = $1`,
      [
        payload.batchId,
        evaluation.conditionStatus,
        evaluation.dataQualityStatus,
        now.toISOString(),
      ],
    );

    return NextResponse.json({ success: true, evaluation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
