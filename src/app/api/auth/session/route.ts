import { NextResponse } from "next/server";
import { extractBearerToken } from "@/server/auth/privy";
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
  } catch {
    return NextResponse.json({ error: "Sesi tidak sah." }, { status: 401 });
  }
}

export function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(APP_SESSION_COOKIE, "", { ...appSessionCookieOptions, maxAge: 0 });
  return response;
}
