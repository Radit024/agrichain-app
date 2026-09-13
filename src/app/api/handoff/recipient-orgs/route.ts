import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readAppSession, APP_SESSION_COOKIE } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listRecipientOrgOptions } from "@/server/queries/internal";

export const runtime = "nodejs";

/** GET /api/handoff/recipient-orgs?fromStage=0|1 — org tujuan handoff. */
export async function GET(req: Request) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Sesi berakhir." }, { status: 401 });
  }
  const fromStage = Number(new URL(req.url).searchParams.get("fromStage"));
  if (fromStage !== 0 && fromStage !== 1) {
    return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  }
  const db = await getDbAdapter();
  const orgs = await listRecipientOrgOptions(db, fromStage);
  return NextResponse.json({ orgs });
}
