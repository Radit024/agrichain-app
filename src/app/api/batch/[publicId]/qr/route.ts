import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { assertBatchOrg } from "@/server/auth/session";

export const runtime = "nodejs";

/**
 * GET /api/batch/[publicId]/qr — PNG QR untuk batch milik org user.
 * QR = URL {APP_URL}/p/{publicId} saja (K9). Sesi internal wajib.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Sesi berakhir. Masuk kembali." }, { status: 401 });
  }

  const { publicId } = await ctx.params;
  const db = await getDbAdapter();
  const rows = await db.query<{ id: string; org_id: string; batch_code: string }>(
    "select id, org_id, batch_code from batches where public_id = $1",
    [publicId],
  );
  const batch = rows[0];
  if (!batch) {
    return NextResponse.json({ error: "Batch tidak tersedia." }, { status: 404 });
  }
  try {
    assertBatchOrg(batch.org_id, session);
  } catch {
    return NextResponse.json({ error: "Akses tidak tersedia." }, { status: 403 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const png = await QRCode.toBuffer(`${appUrl}/p/${publicId}`, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#102A33", light: "#FFFFFF" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "content-disposition": `attachment; filename="qr-${batch.batch_code}.png"`,
      "cache-control": "private, no-store",
    },
  });
}
