import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listBatches, listCategoryOptions } from "@/server/queries/internal";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatePanel } from "@/components/shared/state-panel";
import {
  ConditionStatusBadge,
  DataQualityStatusBadge,
  DistributionStatusBadge,
  HandlingModeBadge,
} from "@/components/status/status-badges";
import { TraceId } from "@/components/status/trace-id";
import { formatDateTime } from "@/components/shared/handoff-timeline";
import { RegisterBatchDialog } from "@/components/batch/register-batch-dialog";
import { BatchFilters, BatchMobileCard } from "@/components/batch/batch-filters";

export const metadata: Metadata = { title: "Batch" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BatchListPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const params = await searchParams;
  const db = await getDbAdapter();

  const get = (k: string) => {
    const v = params[k];
    return typeof v === "string" && v ? v : undefined;
  };

  const [batches, categories] = await Promise.all([
    listBatches(db, session, {
      mode: get("mode") as "COLD_CHAIN" | "NON_COLD_CHAIN" | undefined,
      distribution: get("distribution"),
      condition: get("condition"),
      dataQuality: get("dataQuality"),
      q: get("q"),
    }),
    listCategoryOptions(db, session),
  ]);

  const canRegister = session.memberships.some(
    (m) => m.role === "PRODUCER_ADMIN" || m.role === "FACTORY_STAFF",
  );

  const columns: Column<(typeof batches)[number]>[] = [
    {
      key: "batch",
      header: "Batch",
      cell: (row) => (
        <Link
          href={`/mainapp/batch/${row.id}`}
          className="block min-w-0 hover:underline underline-offset-2"
        >
          <span className="block truncate font-mono text-sm font-semibold text-ink">
            {row.batchCode}
          </span>
          <span className="block truncate text-xs text-ink-muted">{row.categoryName}</span>
        </Link>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      cell: (row) => <HandlingModeBadge mode={row.handlingMode} />,
    },
    {
      key: "public-id",
      header: "ID publik",
      cell: (row) => <TraceId value={row.publicId} label="ID publik" />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span className="flex flex-wrap gap-1.5">
          <DistributionStatusBadge
            value={row.distributionStatus as "DIDAFTARKAN" | "DALAM_DISTRIBUSI" | "SELESAI"}
          />
          <ConditionStatusBadge
            value={row.conditionStatus as "NOT_EVALUATED" | "COMPLIANT" | "AT_RISK"}
          />
          {row.dataQualityStatus === "DATA_UNAVAILABLE" ? (
            <DataQualityStatusBadge value="DATA_UNAVAILABLE" />
          ) : null}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Pembaruan terakhir",
      className: "text-right",
      cell: (row) => (
        <span className="text-xs text-ink-muted">{formatDateTime(row.lastUpdate)}</span>
      ),
    },
    {
      key: "action",
      header: "",
      className: "w-16 text-right",
      cell: (row) => (
        <Link
          href={`/mainapp/batch/${row.id}`}
          className="text-xs font-medium text-brand underline-offset-2 hover:underline"
        >
          Detail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold leading-8 text-ink">Batch</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Batch, mode penanganan, dan status tercatat per organisasi Anda.
          </p>
        </div>
        {canRegister ? (
          <RegisterBatchDialog
            categories={categories}
            custodianWallet={session.user.walletAddress}
          />
        ) : null}
      </header>

      <BatchFilters />

      {batches.length === 0 ? (
        <StatePanel
          state="empty"
          title="Belum ada batch yang sesuai filter."
          description={
            canRegister
              ? "Ubah filter atau daftarkan batch baru untuk memulai."
              : "Belum ada batch yang dapat ditampilkan untuk organisasi Anda."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={batches}
          getRowKey={(r) => r.id}
          mobileCards={(row) => <BatchMobileCard batch={row} />}
        />
      )}
    </div>
  );
}
