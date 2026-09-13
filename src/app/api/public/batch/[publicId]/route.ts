import { NextResponse } from "next/server";
import { getPublicBatchByPublicId } from "@/server/actions/public-batch";
import { normalizePublicId } from "@/modules/public-id";
import { getDbAdapter } from "@/server/db/adapter";
import { checkBucket, LIMITS } from "@/server/rate-limit/postgres";

export const runtime = "nodejs";

/** GET /api/public/batch/[publicId] — ringkasan tersanitasi untuk halaman QR. */
export async function GET(_req: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId: raw } = await ctx.params;
  const ip = _req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // rate limit netral — 404 sama responsenya dengan rate-limit hit
  const db = await getDbAdapter();
  const limit = await checkBucket(db, `public:ip:${ip}`, LIMITS.publicIp);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429 },
    );
  }

  const publicId = normalizePublicId(decodeURIComponent(raw));
  if (!publicId) {
    return NextResponse.json({ error: "Batch tidak tersedia untuk ditampilkan." }, { status: 404 });
  }

  const batch = await getPublicBatchByPublicId(db, publicId);
  if (!batch) {
    // 404 netral — tidak membedakan format salah vs tidak ada
    return NextResponse.json({ error: "Batch tidak tersedia untuk ditampilkan." }, { status: 404 });
  }
  return NextResponse.json(batch, {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
