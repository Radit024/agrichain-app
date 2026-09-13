import type { Metadata } from "next";
import { PrivyLoginButton } from "@/components/auth/privy-login-button";

export const metadata: Metadata = { title: "Masuk Petugas" };

export default function MasukPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Kiri: identitas produk (DESIGN.md split login) */}
      <section className="hidden lg:flex flex-col justify-between bg-brand text-white p-12">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-white/10 text-lg font-bold">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">Agrichain</span>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl font-semibold leading-snug">
            Ketertelusuran distribusi pangan yang dapat diaudit
          </h1>
          <p className="text-base text-white/80 leading-relaxed">
            Satu rekam jejak batch: serah-terima dua konfirmasi, evaluasi kondisi tercatat, dan
            verifikasi akses digital — tanpa perlu memasang ekstensi dompet.
          </p>
        </div>
        <p className="text-sm text-white/60">
          Status menunjukkan evaluasi atas data kondisi yang tercatat, bukan sertifikasi keamanan
          pangan fisik.
        </p>
      </section>

      {/* Kanan: form login 360px (Privy) */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] space-y-6">
          <div className="space-y-2 lg:hidden">
            <h1 className="text-2xl font-semibold text-ink">Agrichain</h1>
            <p className="text-sm text-ink-muted">
              Ketertelusuran distribusi pangan yang dapat diaudit
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-ink">Masuk Petugas</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Akses internal bersifat undangan. Masuk dengan email tanpa kata sandi atau akun sosial
              yang terdaftar pada undangan Anda.
            </p>
          </div>
          <div
            data-privy-login=""
            className="min-h-[220px] rounded-xl border border-border bg-card p-6"
          >
            <PrivyLoginButton />
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            MetaMask tidak diperlukan. Dompet tertanam dibuat otomatis untuk akun internal yang
            berwenang mencatat transaksi.
          </p>
        </div>
      </section>
    </main>
  );
}
