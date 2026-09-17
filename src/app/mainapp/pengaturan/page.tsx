import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AlertTriangle, Lock } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listCategoryProfiles } from "@/server/queries/internal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { HandlingModeBadge } from "@/components/status/status-badges";
import { formatPPMDisplay } from "@/components/shared/handoff-timeline";
import { parameterLabel } from "@/components/shared/compliance-card";

export const metadata: Metadata = { title: "Pengaturan Organisasi" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const categories = await listCategoryProfiles(db, session);

  const isContractAdmin = session.memberships.some((m) => m.role === "CONTRACT_ADMIN");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold leading-8 text-ink">
          Pengaturan Organisasi dan Standar
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Profil monitoring berversi, keanggotaan, dan konfigurasi sistem.
        </p>
      </header>

      {/* Profil kategori + parameter */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">Kategori & profil monitoring</h2>
        {categories.length === 0 ? (
          <StatePanel
            state="empty"
            title="Belum ada kategori."
            description="Kategori dan profil dibuat melalui seed/administrasi awal organisasi."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {categories.map((c) => (
              <Card key={c.categoryId}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">{c.categoryName}</CardTitle>
                  <HandlingModeBadge mode={c.handlingMode} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {c.profiles.map((p) => (
                    <div
                      key={p.profileId}
                      className="rounded-lg border border-border p-3"
                      aria-label={`Profil versi ${p.version}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-ink">Profil versi {p.version}</p>
                        <span className="flex items-center gap-1 text-xs text-ink-muted">
                          {p.isLocked ? (
                            <>
                              <Lock aria-hidden className="size-3" />
                              Terkunci
                            </>
                          ) : (
                            "Draf"
                          )}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Pembacaan dianggap stale setelah {p.staleAfterSeconds}s
                      </p>
                      {p.rules.length === 0 ? (
                        <p className="mt-2 text-xs text-ink-muted">Tidak ada aturan parameter.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {p.rules.map((r) => (
                            <li
                              key={r.code}
                              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                            >
                              <span className="text-xs font-medium text-ink">
                                {parameterLabel(r.code)}
                                {r.required ? (
                                  <span className="ml-1.5 font-normal text-ink-muted">wajib</span>
                                ) : null}
                                <span className="ml-1.5 font-normal text-[11px] text-warning">
                                  {r.severity.toLowerCase()}
                                </span>
                              </span>
                              <span className="tnum text-xs text-ink-muted">
                                {r.minPPM !== null || r.maxPPM !== null
                                  ? `${r.minPPM !== null ? formatPPMDisplay(r.minPPM) : "–"} s.d. ${
                                      r.maxPPM !== null ? formatPPMDisplay(r.maxPPM) : "–"
                                    } ${r.unit}`
                                  : "konteks"}
                                {r.toleranceSeconds ? ` · toleransi ${r.toleranceSeconds}s` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Keanggotaan */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">Keanggotaan & peran</h2>
        <Card>
          <CardContent className="divide-y divide-border">
            {session.memberships.map((m) => (
              <div
                key={`${m.orgId}-${m.role}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span className="text-sm font-medium text-ink">{m.orgName}</span>
                <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">
                  {roleLabel(m.role)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Blok pause terisolasi — hanya CONTRACT_ADMIN */}
      <section
        className="rounded-xl border-2 border-danger/40 bg-danger-soft/50 p-5"
        aria-label="Kontrol darurat kontrak"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <h2 className="text-sm font-semibold text-ink">Kontrol darurat pencatatan on-chain</h2>
            <p className="mt-1 text-xs leading-4 text-ink-muted">
              Pause menghentikan mutasi baru (pendaftaran, serah-terima, evaluasi) sementara
              pembacaan riwayat tetap tersedia. Aksi ini terisolasi untuk administrator kontrak.
            </p>
            {isContractAdmin ? (
              <p className="mt-2 rounded-md bg-card px-3 py-2 text-xs text-ink">
                Anda memiliki akses CONTRACT_ADMIN. Kontrol pause/unpause dijalankan melalui kontrak
                on-chain.
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium text-danger">
                Akun ini bukan administrator kontrak — kontrol tidak tersedia.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    PRODUCER_ADMIN: "Admin Produsen",
    FACTORY_STAFF: "Petugas Pabrik",
    DISTRIBUTOR_ADMIN: "Admin Distributor",
    RETAILER_ADMIN: "Admin Retailer",
    CONTRACT_ADMIN: "Administrator Kontrak",
  };
  return map[role] ?? role;
}
