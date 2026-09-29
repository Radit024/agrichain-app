import type { Metadata } from "next";
import { normalizePublicId } from "@/modules/public-id";
import { getPublicBatchByPublicId, type PublicBatchView } from "@/server/actions/public-batch";
import { getDbAdapter } from "@/server/db/adapter";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ExternalLink, Info, ShieldCheck } from "lucide-react";
import {
  ConditionStatusBadge,
  DataQualityStatusBadge,
  DistributionStatusBadge,
  SourceBadge,
} from "@/components/status/status-badges";
import { TraceId } from "@/components/status/trace-id";
import { StaggerContainer, StaggerItem, MotionCard } from "@/components/motion/motion-container";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `Detail batch ${publicId.slice(0, 9)}…` };
}

/**
 * Halaman publik QR (DESIGN.md): mobile-first, tanpa shell internal, tanpa
 * login. Kartu hasil → penjelasan status → timeline tersanitasi →
 * disclosure Batasan informasi. Tidak ada lokasi presisi, identitas
 * petugas, atau kontrol organisasi. 404 netral via notFound().
 */
export default async function PublicBatchPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId: raw } = await params;
  const publicId = normalizePublicId(decodeURIComponent(raw));
  if (!publicId) notFound();

  const db = await getDbAdapter();
  const batch = await getPublicBatchByPublicId(db, publicId);
  if (!batch) notFound();

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Top bar mobile publik */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-card px-4">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded bg-brand text-primary-foreground">
          <ChevronLeft aria-hidden className="hidden" />
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <path d="M14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
          </svg>
        </span>
        <span className="text-sm font-semibold text-ink">Detail batch</span>
        <span className="ml-auto">
          <SourceBadge />
        </span>
      </header>

      <StaggerContainer className="mx-auto w-full max-w-[480px] space-y-4 px-4 pt-6">
        {/* Kartu identitas batch */}
        <StaggerItem>
          <MotionCard
            className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-[#D0D5DD] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
            aria-label="Identitas batch"
          >
            <p className="text-xs text-ink-muted">Produk / kategori</p>
            <p className="mt-0.5 text-base font-semibold text-ink">{batch.categoryName}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">ID:</span>
              <TraceId value={batch.publicId} label="ID publik" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <DistributionStatusBadge value={batch.distributionStatus} />
              <ConditionStatusBadge value={batch.conditionStatus} />
              <DataQualityStatusBadge value={batch.dataQualityStatus} />
            </div>
            {batch.paused ? (
              <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-muted">
                Pencatatan status terkini ditunda sementara.
              </p>
            ) : null}
          </MotionCard>
        </StaggerItem>

        {/* Penjelasan status */}
        <StaggerItem>
          <MotionCard
            className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-[#D0D5DD] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
            aria-label="Penjelasan status"
          >
            <h2 className="text-sm font-semibold text-ink">Status batch</h2>
            <p className="mt-1.5 text-xs leading-5 text-ink-muted">{statusExplanation(batch)}</p>
            <p className="mt-2 rounded-lg bg-info-soft px-3 py-2 text-xs leading-4 text-info">
              Status menunjukkan evaluasi atas data kondisi yang tercatat.
            </p>
          </MotionCard>
        </StaggerItem>

        {/* Timeline tersanitasi */}
        <StaggerItem>
          <MotionCard
            className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-[#D0D5DD] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
            aria-label="Riwayat tercatat"
          >
            <h2 className="text-sm font-semibold text-ink">Riwayat tercatat</h2>
            <ol className="mt-3 space-y-3">
              <li className="flex items-start gap-2.5">
                <CheckCircle2
                  aria-hidden
                  className={`mt-0.5 size-4 shrink-0 ${
                    batch.custodyStage >= 0 ? "text-brand" : "text-ink-muted"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-ink">Pabrik</p>
                  <p className="text-xs text-ink-muted">
                    Batch didaftarkan {formatDate(batch.createdAt)}
                  </p>
                </div>
              </li>
              {timelineStage(batch, 1, "Diterima distributor")}
              {timelineStage(batch, 2, "Diterima retailer")}
            </ol>
          </MotionCard>
        </StaggerItem>

        {/* Verifikasi On-Chain di Scanner */}
        {batch.chainTxHash ? (
          <StaggerItem>
            <MotionCard
              className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-[#D0D5DD] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
              aria-label="Verifikasi blockchain"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#1570EF]" />
                  <h2 className="text-sm font-semibold text-ink">Verifikasi On-Chain</h2>
                </div>
                <a
                  href={`https://amoy.polygonscan.com/tx/${batch.chainTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1570EF] hover:underline"
                >
                  Cek di Scanner
                  <ExternalLink className="size-3" />
                </a>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                Catatan integritas batch ini telah terverifikasi dan tercatat pada buku besar
                terdistribusi Polygon Amoy.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted p-2.5">
                <span className="text-[11px] font-medium text-ink-muted">Hash Transaksi:</span>
                <TraceId value={batch.chainTxHash} isTx={true} label="Tx Hash" />
              </div>
            </MotionCard>
          </StaggerItem>
        ) : null}

        {/* Batasan informasi — persisten */}
        <StaggerItem>
          <MotionCard
            className="rounded-xl border border-border bg-surface-muted p-4 transition-all duration-200"
            aria-label="Batasan informasi"
          >
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Info aria-hidden className="size-4 text-info" />
              Batasan informasi
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs leading-5 text-ink-muted">
              <li>
                Data kondisi berasal dari sumber{" "}
                <span className="font-medium text-info">SIMULATOR</span>, bukan sensor fisik; status
                adalah evaluasi atas data tercatat.
              </li>
              <li>
                Status compliant tidak berarti produk aman dikonsumsi — informasi ini bukan
                sertifikasi keamanan pangan.
              </li>
              <li>Riwayat menampilkan titik distribusi secara umum tanpa lokasi presisi.</li>
              <li>QR dapat disalin; sistem tidak menyimpulkan keaslian fisik produk.</li>
            </ul>
          </MotionCard>
        </StaggerItem>

        <footer className="pt-2 text-center">
          <Link href="/" className="text-xs text-ink-muted underline-offset-2 hover:underline">
            Tentang ketertelusuran distribusi pangan
          </Link>
        </footer>
      </StaggerContainer>
    </div>
  );
}

function timelineStage(batch: PublicBatchView, stage: number, label: string) {
  const event = batch.timeline.find((t) => t.toStage === stage);
  const pending = batch.custodyStage === stage - 1 && !event;
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          event
            ? "border-brand bg-brand"
            : pending
              ? "border-warning bg-warning-soft ring-4 ring-amber-400/20 animate-pulse"
              : "border-border bg-card"
        }`}
      />
      <div>
        <p className="text-sm font-medium text-ink">{stage === 1 ? "Distributor" : "Retailer"}</p>
        <p className="text-xs text-ink-muted">
          {event
            ? `${label} ${formatDate(event.confirmedAt)}`
            : pending
              ? "Menunggu penerimaan"
              : "Belum tercatat"}
        </p>
      </div>
    </li>
  );
}

function statusExplanation(batch: PublicBatchView): string {
  const parts: string[] = [];
  switch (batch.distributionStatus) {
    case "DIDAFTARKAN":
      parts.push("Batch terdaftar dan masih di titik asal (pabrik).");
      break;
    case "DALAM_DISTRIBUSI":
      parts.push("Batch sedang berada di jalur distribusi.");
      break;
    case "SELESAI":
      parts.push("Perjalanan distribusi batch telah tercatat selesai.");
      break;
  }
  switch (batch.conditionStatus) {
    case "NOT_EVALUATED":
      parts.push("Kondisi belum dievaluasi karena belum ada pembacaan tercatat.");
      break;
    case "COMPLIANT":
      parts.push(
        "Data kondisi tercatat sesuai batas profil selama perjalanan (sesuai data kondisi tercatat).",
      );
      break;
    case "AT_RISK":
      parts.push(
        "Terdapat data kondisi tercatat di luar batas profil — tindak lanjut distribusi disarankan.",
      );
      break;
  }
  if (batch.dataQualityStatus === "DATA_UNAVAILABLE") {
    parts.push("Data kondisi terbaru tidak tersedia sehingga evaluasi tertunda.");
  }
  return parts.join(" ");
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
