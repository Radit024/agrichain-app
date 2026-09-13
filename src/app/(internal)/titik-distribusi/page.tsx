import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MapPin, Users } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listDistributionPoints, weekdayLabel } from "@/server/queries/internal";
import { StatePanel } from "@/components/shared/state-panel";

export const metadata: Metadata = { title: "Titik Distribusi" };
export const dynamic = "force-dynamic";

export default async function DistributionPointsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const points = await listDistributionPoints(db, session);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold leading-8 text-ink">Titik Distribusi</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Titik, jadwal otorisasi, dan penugasan petugas per organisasi Anda.
        </p>
      </header>

      {points.length === 0 ? (
        <StatePanel
          state="empty"
          title="Belum ada titik distribusi."
          description="Titik distribusi dibuat melalui pengaturan organisasi atau migrasi awal."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {points.map((p) => (
            <section
              key={p.id}
              className="rounded-xl border border-border bg-card p-5"
              aria-label={`Titik ${p.publicName}`}
            >
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">{p.publicName}</h2>
                  <p className="mt-0.5 text-xs text-ink-muted">{p.orgName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                    p.isActive
                      ? "bg-compliant-soft text-compliant"
                      : "bg-surface-muted text-ink-muted"
                  }`}
                >
                  {p.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </header>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <MapPin aria-hidden className="size-3.5" />
                    Jadwal otorisasi
                  </p>
                  {p.schedules.length === 0 ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      Belum ada jadwal — verifikasi di titik ini selalu anomali jadwal.
                    </p>
                  ) : (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.schedules.map((s, i) => (
                        <li
                          key={i}
                          className="rounded-md bg-surface-muted px-2 py-1 text-xs text-ink"
                        >
                          {weekdayLabel(s.weekday)} {s.start}–{s.end}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <Users aria-hidden className="size-3.5" />
                    Petugas yang ditugaskan
                  </p>
                  {p.assignedUserNames.length === 0 ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      Belum ada petugas — verifikasi di titik ini akan ditolak.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-ink">{p.assignedUserNames.join(", ")}</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
