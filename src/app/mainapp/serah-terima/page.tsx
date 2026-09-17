import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import {
  listHandoffs,
  listHandoffableBatches,
  listPendingConfirmations,
} from "@/server/queries/internal";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatePanel } from "@/components/shared/state-panel";
import { HandoffIntentBadge } from "@/components/status/status-badges";
import { formatDateTime, HandoffStageRow } from "@/components/shared/handoff-timeline";
import {
  CancelHandoffButton,
  ConfirmHandoffButton,
  InitiateHandoffDialog,
} from "@/components/handoff/handoff-dialogs";

export const metadata: Metadata = { title: "Serah-terima" };
export const dynamic = "force-dynamic";

export default async function HandoffPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();

  const [intents, handoffable, pendingForMe] = await Promise.all([
    listHandoffs(db, session),
    listHandoffableBatches(db, session),
    listPendingConfirmations(db, session),
  ]);

  const columns: Column<(typeof intents)[number]>[] = [
    {
      key: "batch",
      header: "Batch",
      cell: (r) => (
        <Link
          href={`/mainapp/batch/${r.batchId}`}
          className="font-mono text-sm font-semibold text-ink hover:underline underline-offset-2"
        >
          {r.batchCode}
        </Link>
      ),
    },
    {
      key: "route",
      header: "Asal → Tujuan",
      cell: (r) => (
        <span className="flex flex-col text-xs">
          <span className="font-medium text-ink">
            {r.senderOrgName} → {r.recipientOrgName}
          </span>
          <span className="text-ink-muted">
            {stageLabel(r.fromStage)} → {stageLabel(r.toStage)}
          </span>
        </span>
      ),
    },
    {
      key: "time",
      header: "Waktu",
      cell: (r) => (
        <span className="text-xs text-ink-muted">
          Diajukan {formatDateTime(r.initiatedAt)}
          {r.confirmedAt ? (
            <span className="block">Dikonfirmasi {formatDateTime(r.confirmedAt)}</span>
          ) : r.status === "PENDING" ? (
            <span className="block">Kedaluwarsa {formatDateTime(r.expiresAt)}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <HandoffIntentBadge value={r.status as "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED"} />
      ),
    },
    {
      key: "action",
      header: "",
      className: "w-44 text-right",
      cell: (r) =>
        r.isRecipient ? (
          <ConfirmHandoffButton batchId={r.batchId} batchCode={r.batchCode} />
        ) : r.isSender ? (
          <CancelHandoffButton batchId={r.batchId} />
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold leading-8 text-ink">Serah-terima</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Dua konfirmasi: pengirim mengajukan, penerima menkonfirmasi. Stage hanya berpindah
            setelah konfirmasi penerima.
          </p>
        </div>
        <InitiateHandoffDialog batches={handoffable} />
      </header>

      {pendingForMe.length > 0 ? (
        <section
          className="rounded-xl border border-warning/30 bg-warning-soft p-4"
          role="region"
          aria-label="Menunggu konfirmasi Anda"
        >
          <h2 className="text-sm font-semibold text-warning">
            Menunggu konfirmasi Anda ({pendingForMe.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {pendingForMe.map((p) => (
              <li
                key={p.intentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-ink">{p.batchCode}</p>
                  <p className="text-xs text-ink-muted">
                    Kedaluwarsa {formatDateTime(p.expiresAt)}
                  </p>
                </div>
                <ConfirmHandoffButton batchId={p.batchId} batchCode={p.batchCode} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {intents.length === 0 ? (
        <StatePanel
          state="empty"
          title="Belum ada serah-terima tercatat."
          description="Ajukan serah-terima dari batch yang Anda kustodi untuk memulai rantai distribusi."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={intents}
            getRowKey={(r) => r.intentId}
            mobileCards={(r) => (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/mainapp/batch/${r.batchId}`}
                    className="font-mono text-sm font-semibold text-ink"
                  >
                    {r.batchCode}
                  </Link>
                  <HandoffIntentBadge
                    value={r.status as "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED"}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {r.senderOrgName} → {r.recipientOrgName}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  Diajukan {formatDateTime(r.initiatedAt)}
                </p>
                {r.isRecipient ? (
                  <div className="mt-3">
                    <ConfirmHandoffButton batchId={r.batchId} batchCode={r.batchCode} />
                  </div>
                ) : r.isSender ? (
                  <div className="mt-3">
                    <CancelHandoffButton batchId={r.batchId} />
                  </div>
                ) : null}
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}

function stageLabel(stage: number): string {
  return stage === 0 ? "Pabrik" : stage === 1 ? "Distributor" : "Retailer";
}
