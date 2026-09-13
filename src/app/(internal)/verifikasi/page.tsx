import type { Metadata } from "next";
import { cookies } from "next/headers";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listMyAssignedPoints } from "@/server/queries/internal";
import { AccessVerificationForm } from "@/components/verify/access-verification-form";
import { StatePanel } from "@/components/shared/state-panel";

export const metadata: Metadata = { title: "Verifikasi Akses" };
export const dynamic = "force-dynamic";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const points = await listMyAssignedPoints(db, session);
  const { batch } = await searchParams;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold leading-8 text-ink">Verifikasi Akses</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pindai QR batch, lalu masukkan kode otorisasi. Hasil menunjukkan kesesuaian data tercatat
          — bukan akses fisik.
        </p>
      </header>

      {points.length === 0 ? (
        <StatePanel
          state="no-access"
          title="Belum ada titik yang ditugaskan kepada Anda."
          description="Hubungi administrator organisasi untuk menugaskan Anda ke titik distribusi sebelum verifikasi akses."
        />
      ) : (
        <div className="mx-auto max-w-[560px]">
          <AccessVerificationForm points={points} initialPublicId={batch} />
        </div>
      )}
    </div>
  );
}
