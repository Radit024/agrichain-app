import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Plus, AlertTriangle } from "lucide-react";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { getDbAdapter } from "@/server/db/adapter";
import { listCategoryProfiles } from "@/server/queries/internal";

export const metadata: Metadata = { title: "Pengaturan Organisasi" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDbAdapter();
  const categories = await listCategoryProfiles(db, session);

  const isContractAdmin = session.memberships.some((m) => m.role === "CONTRACT_ADMIN");

  const defaultBranches = [
    {
      branch: "Gudang Penyangga Karawang",
      storeName: "Sentra Logistik Pangan Utama",
      address1: "Kawasan Industri KIIC Kav. C-12, Karawang Barat",
      city: "Karawang, Jawa Barat - 41361",
      phone: "0267-8451200",
    },
    {
      branch: "Depo Transit Cikarang",
      storeName: "Hub Distribusi Dingin Cikarang",
      address1: "Jl. Industri Selatan Blok JJ No. 8, Cikarang",
      city: "Bekasi, Jawa Barat - 17530",
      phone: "021-89842100",
    },
    {
      branch: "Sentra Distribusi Surabaya",
      storeName: "Depo Hub Distribusi Jawa Timur",
      address1: "Kawasan Pergudangan Margomulyo Indah Blok B-7",
      city: "Surabaya, Jawa Timur - 60186",
      phone: "031-7495800",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Add Store (Persis 08-organization-settings.png) */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1D2939]">Pengaturan Organisasi</h1>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
        >
          <Plus className="size-4" />
          <span>Tambah Fasilitas</span>
        </button>
      </div>

      {/* Stacked Branch Store Cards (Persis 08-organization-settings.png) */}
      <div className="space-y-4">
        {session.memberships.map((m, idx) => {
          const fallback = defaultBranches[idx % defaultBranches.length];
          return (
            <div
              key={`${m.orgId}-${m.role}`}
              className="flex flex-col md:flex-row items-stretch overflow-hidden rounded-xl border border-[#F0F1F3] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              {/* Left Gray Box with Branch Name */}
              <div className="flex w-full md:w-64 shrink-0 items-center justify-center bg-[#F9FAFB] p-6 text-center border-b md:border-b-0 md:border-r border-[#F0F1F3]">
                <span className="font-semibold text-sm text-[#1D2939]">{fallback.branch}</span>
              </div>

              {/* Right Store Info & Edit Button */}
              <div className="flex flex-1 items-center justify-between p-6">
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-[#1D2939]">
                    {m.orgName || fallback.storeName}
                  </h3>
                  <p className="text-xs text-[#858D9D]">{fallback.address1}</p>
                  <p className="text-xs text-[#858D9D]">{fallback.city}</p>
                  <p className="text-xs text-[#858D9D] font-mono mt-1">{fallback.phone}</p>
                </div>

                <button
                  type="button"
                  className="rounded-lg border border-[#1570EF] bg-white px-5 py-1.5 text-xs font-semibold text-[#1570EF] hover:bg-[#EFF8FF] transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}

        {/* Tambahan baris jika membership sedikit */}
        {session.memberships.length < 3 &&
          defaultBranches.slice(session.memberships.length).map((b, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row items-stretch overflow-hidden rounded-xl border border-[#F0F1F3] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <div className="flex w-full md:w-64 shrink-0 items-center justify-center bg-[#F9FAFB] p-6 text-center border-b md:border-b-0 md:border-r border-[#F0F1F3]">
                <span className="font-semibold text-sm text-[#1D2939]">{b.branch}</span>
              </div>
              <div className="flex flex-1 items-center justify-between p-6">
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-[#1D2939]">{b.storeName}</h3>
                  <p className="text-xs text-[#858D9D]">{b.address1}</p>
                  <p className="text-xs text-[#858D9D]">{b.city}</p>
                  <p className="text-xs text-[#858D9D] font-mono mt-1">{b.phone}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-[#1570EF] bg-white px-5 py-1.5 text-xs font-semibold text-[#1570EF] hover:bg-[#EFF8FF] transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Standard Monitoring Profiles & Emergency Controls */}
      <div className="mt-8 rounded-xl border border-[#F0F1F3] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <h2 className="text-base font-semibold text-[#1D2939]">
          Standar Pemantauan & Keamanan On-Chain
        </h2>
        <p className="mt-1 text-xs text-[#858D9D]">
          Parameter kepatuhan rantai pasok berversi dan kontrol darurat smart contract.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((c) => (
            <div
              key={c.categoryId}
              className="rounded-lg border border-[#E4E7EC] p-4 bg-[#F9FAFB]/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#1D2939]">{c.categoryName}</span>
                <span className="rounded-md bg-[#EFF8FF] px-2 py-0.5 text-xs font-semibold text-[#1570EF]">
                  {c.handlingMode}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#858D9D]">
                {c.profiles.length} versi profil tersimpan permanen on-chain.
              </p>
            </div>
          ))}
        </div>

        {/* Kontrol Darurat On-Chain */}
        <div className="mt-6 rounded-lg border border-[#FEE2E2] bg-[#FFF1F2]/60 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-xs text-[#1D2939]">
                Kontrol Darurat On-Chain (Emergency Pause)
              </h4>
              <p className="mt-0.5 text-[11px] text-[#5D6679]">
                Menghentikan transaksi mutasi baru (pendaftaran & serah-terima) jika anomali kritis
                terdeteksi.
              </p>
              {isContractAdmin ? (
                <button
                  type="button"
                  className="mt-2.5 rounded-md bg-[#EF4444] px-3 py-1 text-xs font-semibold text-white hover:bg-[#DC2626]"
                >
                  Aktifkan Emergency Pause
                </button>
              ) : (
                <p className="mt-1 text-[11px] font-medium text-[#EF4444]">
                  Akses terbatas untuk CONTRACT_ADMIN.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
