import { NextResponse } from "next/server";
import { getDbAdapter } from "@/server/db/adapter";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const apiKey = req.headers.get("x-internal-api-key") || req.headers.get("x-simulator-key");
    const expectedKey =
      process.env.INTERNAL_API_KEY ||
      process.env.SIMULATOR_API_KEY ||
      "agrichain-simulator-dev-key";

    if (apiKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDbAdapter();
    const batches = await db.query<{
      id: string;
      distribution_status: string;
      paused: boolean;
      profile_snapshot: unknown;
    }>(
      `select id, distribution_status, paused, profile_snapshot
       from batches
       where distribution_status != 'SELESAI' and paused = false`,
    );

    return NextResponse.json({ batches });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
