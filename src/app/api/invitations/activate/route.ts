import { NextResponse } from "next/server";
import { z } from "zod";
import { getDbAdapter } from "@/server/db/adapter";
import { getRequestAccessToken } from "@/server/auth/request-session";
import { verifyPrivyAccessToken } from "@/server/auth/privy";
import {
  APP_SESSION_COOKIE,
  appSessionCookieOptions,
  createAppSession,
} from "@/server/auth/app-session";
import { acceptInvitation, InviteError } from "@/server/actions/invitations";

export const runtime = "nodejs";

const activationSchema = z.object({
  token: z.string().min(16).max(128),
  email: z.string().email(),
  displayName: z.string().min(2).max(100),
  walletAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const accessToken = getRequestAccessToken(request);
    if (!accessToken) throw new InviteError("INVALID");
    const [privyUser, body] = await Promise.all([
      verifyPrivyAccessToken(accessToken),
      request.json(),
    ]);
    const input = activationSchema.parse(body);
    await acceptInvitation({ ...input, privyDid: privyUser.did }, await getDbAdapter());
    const { token } = await createAppSession(accessToken);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(APP_SESSION_COOKIE, token, appSessionCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Undangan tidak dapat diaktivasi." }, { status: 400 });
  }
}
