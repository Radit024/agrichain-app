import { NextResponse } from "next/server";
import { extractBearerToken } from "@/server/auth/privy";
import { AuthError } from "@/server/auth/session";
import {
  APP_SESSION_COOKIE,
  appSessionCookieOptions,
  createAppSession,
} from "@/server/auth/app-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const accessToken = extractBearerToken(request.headers.get("authorization"));
  if (!accessToken) return NextResponse.json({ error: "Sesi tidak sah." }, { status: 401 });
  try {
    const { token } = await createAppSession(accessToken);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(APP_SESSION_COOKIE, token, appSessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof AuthError && error.code === "NO_ACCESS") {
      return NextResponse.json(
        { error: "Akun belum diaktivasi.", code: "NO_ACCESS" },
        { status: 403 },
      );
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Sesi tidak sah.", code: error.code }, { status: 401 });
    }
    return NextResponse.json({ error: "Sesi tidak sah." }, { status: 401 });
  }
}

export function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(APP_SESSION_COOKIE, "", { ...appSessionCookieOptions, maxAge: 0 });
  return response;
}
