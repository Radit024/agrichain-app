import { NextResponse } from "next/server";
import { getDbAdapter } from "@/server/db/adapter";
import { requireRequestSession } from "@/server/auth/request-session";
import { InviteError, revokeInvitation } from "@/server/actions/invitations";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ invitationId: string }> },
) {
  try {
    const [{ invitationId }, session] = await Promise.all([
      context.params,
      requireRequestSession(request),
    ]);
    await revokeInvitation(invitationId, await getDbAdapter(), session);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = error instanceof InviteError ? 403 : 401;
    return NextResponse.json({ error: "Undangan tidak dapat diproses." }, { status });
  }
}
