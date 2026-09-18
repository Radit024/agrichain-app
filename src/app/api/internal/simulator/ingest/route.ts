import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { evaluateCondition, ConditionReading } from "../../../../../modules/condition-policy";
import type { ParameterCode } from "../../../../../modules/shared-types";
import type { MonitoringProfile } from "../../../../../modules/monitoring-profile";

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
    const apiKey = req.headers.get("x-internal-api-key");
    if (!process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload = IngestSchema.parse(body);

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // 1. Get batch profile
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("profile_snapshot")
      .eq("id", payload.batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const profile = batch.profile_snapshot as unknown as MonitoringProfile;

    // 2. Insert reading
    const { data: readingData, error: readingError } = await supabase
      .from("condition_readings")
      .insert({
        batch_id: payload.batchId,
        read_at: payload.readAt,
        device_health: payload.deviceHealth,
        source: "SIMULATOR",
        scenario: payload.scenario,
        seed: payload.seed,
      })
      .select("id")
      .single();

    if (readingError || !readingData) {
      return NextResponse.json({ error: "Failed to insert reading" }, { status: 500 });
    }

    const readingId = readingData.id;

    // 3. Insert measurements
    if (payload.measurements && payload.measurements.length > 0) {
      const measurementRows = payload.measurements.map((m) => ({
        reading_id: readingId,
        parameter_code: m.code,
        value_ppm: m.valuePPM,
      }));

      const { error: measError } = await supabase
        .from("condition_measurements")
        .insert(measurementRows);

      if (measError) {
        return NextResponse.json({ error: "Failed to insert measurements" }, { status: 500 });
      }
    }

    // 4. Fetch last 10 readings with their measurements to run policy
    const { data: historyData, error: historyError } = await supabase
      .from("condition_readings")
      .select(
        `
        read_at,
        device_health,
        condition_measurements (
          parameter_code,
          value_ppm
        )
      `,
      )
      .eq("batch_id", payload.batchId)
      .order("read_at", { ascending: false })
      .limit(10);

    if (historyError) {
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    // Reconstruct history array in chronological order (oldest first)
    const historyReadings: ConditionReading[] = historyData
      .map((r) => {
        const values: Partial<Record<ParameterCode, number>> = {};
        const measurements = (r.condition_measurements ?? []) as Array<{
          parameter_code: string;
          value_ppm: number;
        }>;
        for (const m of measurements) {
          values[m.parameter_code as ParameterCode] = m.value_ppm;
        }
        return {
          values,
          deviceHealth: r.device_health,
          source: "SIMULATOR",
          at: new Date(r.read_at),
        } as ConditionReading;
      })
      .reverse();

    // Attach latest door and cooling states if provided
    const latest = historyReadings[historyReadings.length - 1];
    if (latest) {
      latest.doorState = payload.doorState;
      latest.coolingState = payload.coolingState;
    }

    // 5. Evaluate condition
    const now = new Date(payload.readAt);
    const evaluation = evaluateCondition(profile, historyReadings, now);

    // 6. Insert evaluation
    const { error: evalError } = await supabase.from("condition_evaluations").insert({
      batch_id: payload.batchId,
      reading_id: readingId,
      condition_status: evaluation.conditionStatus,
      data_quality_status: evaluation.dataQualityStatus,
      reasons: evaluation.reasons,
      operational_alerts: evaluation.operationalAlerts,
      evaluated_at: evaluation.evaluatedAt.toISOString(),
    });

    if (evalError) {
      return NextResponse.json({ error: "Failed to insert evaluation" }, { status: 500 });
    }

    // 7. Update batch status
    const { error: updateError } = await supabase
      .from("batches")
      .update({
        condition_status: evaluation.conditionStatus,
        data_quality_status: evaluation.dataQualityStatus,
        updated_at: now.toISOString(),
      })
      .eq("id", payload.batchId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update batch" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
