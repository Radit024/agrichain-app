import { NextResponse } from "next/server";
import { getDbAdapter } from "@/server/db/adapter";
import { requireRequestSession } from "@/server/auth/request-session";
import { createManagedInvitation, InviteError } from "@/server/actions/invitations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const [session, body] = await Promise.all([requireRequestSession(request), request.json()]);
    const invitation = await createManagedInvitation(body, await getDbAdapter(), session);
    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    const status = error instanceof InviteError ? 403 : 401;
    return NextResponse.json({ error: "Undangan tidak dapat diproses." }, { status });
  }
}
