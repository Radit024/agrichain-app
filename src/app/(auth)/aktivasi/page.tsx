import type { Metadata } from "next";
import { InvitationActivationForm } from "@/components/auth/invitation-activation-form";

export const metadata: Metadata = { title: "Aktivasi Undangan" };

export default async function AktivasiPage({ searchParams }: PageProps<"/aktivasi">) {
  const token = (await searchParams).token;
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between bg-brand text-white p-12">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-white/10 text-lg font-bold">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">Agrichain</span>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl font-semibold leading-snug">Aktivasi Undangan Petugas</h1>
          <p className="text-base text-white/80 leading-relaxed">
            Akun internal hanya dapat dibuat melalui undangan administrator. Aktivasi mengonfirmasi
            identitas, organisasi, peran, dan dompet tertanam Anda.
          </p>
        </div>
        <p className="text-sm text-white/60">
          Undangan kedaluwarsa atau tidak dikenal tidak membuka jalur pendaftaran mandiri.
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-ink">Aktivasi Undangan</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Buka tautan undangan dari administrator, lalu masuk dengan identitas (email/akun
              sosial) yang menerima undangan.
            </p>
          </div>
          {typeof token === "string" && token.length >= 16 ? (
            <InvitationActivationForm invitationToken={token} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-ink-muted">
              Tautan undangan tidak valid atau kedaluwarsa. Hubungi administrator organisasi Anda.
            </div>
          )}
          <ol className="space-y-3 text-sm text-ink-muted list-decimal list-inside">
            <li>Masuk dengan email atau akun sosial penerima undangan</li>
            <li>Sistem memverifikasi token undangan (hash Argon2id, server-side)</li>
            <li>Konfirmasi organisasi dan peran Anda</li>
            <li>Dompet tertanam dibuat untuk tugas pencatatan bila berwenang</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
