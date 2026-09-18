"use client";

import Link from "next/link";
import { Bell, Search, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HexagonBrandLogo } from "@/components/brand/brand-logo";

/**
 * Topbar internal.
 * Mobile: logo kiri + bell kanan (navigasi via MobileBottomBar).
 * Desktop (md+): search form di tengah + QR scan + bell + avatar.
 */
interface InternalTopbarProps {
  isDemo?: boolean;
  currentRole?: string;
}

const DEMO_ROLES = [
  { key: "PRODUCER_ADMIN", label: "Produsen (Budi)" },
  { key: "DISTRIBUTOR_ADMIN", label: "Distributor (Siti)" },
  { key: "RETAILER_ADMIN", label: "Retailer (Hendra)" },
  { key: "FACTORY_STAFF", label: "Petugas Pabrik (Ahmad)" },
] as const;

export function InternalTopbar({ isDemo = false, currentRole }: InternalTopbarProps) {
  const handleSwitch = async (newRole: string) => {
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // Abaikan
    }
  };

  return (
    <header className="shrink-0 z-30 flex h-[60px] sm:h-[76px] items-center justify-between border-b border-[#F0F1F3] bg-white px-4 sm:px-6 lg:px-8">
      {/* Mobile: Brand logo tanpa hamburger — navigasi via bottom bar */}
      <div className="flex items-center gap-2 lg:hidden">
        <HexagonBrandLogo className="size-6 shrink-0" />
        <span className="font-bold text-base text-[#1570EF]">AGRILINK</span>
      </div>

      {/* Desktop: Kotak Pencarian Domain Ketertelusuran */}
      <form
        action="/mainapp/batch"
        className="relative hidden w-full max-w-[420px] transition-all duration-200 focus-within:max-w-[450px] md:block"
        role="search"
      >
        <label htmlFor="topbar-search" className="sr-only">
          Cari batch, komoditas, titik distribusi
        </label>
        <div className="relative flex items-center">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 size-4 text-[#858D9D] z-10"
          />
          <Input
            id="topbar-search"
            name="q"
            type="search"
            placeholder="Cari batch, komoditas, titik distribusi..."
            className="h-10 w-full rounded-lg border-[#D0D5DD] bg-white pl-10 pr-3.5 text-sm text-[#1D2939] placeholder-[#858D9D] transition-all duration-150 focus-visible:border-[#1570EF] focus-visible:ring-2 focus-visible:ring-[#1570EF]/15"
          />
        </div>
      </form>

      {/* Sisi Kanan: Role Switcher (Demo) + QR scan (sm+) + Bell notifikasi + Avatar (lg) */}
      <div className="ml-auto flex items-center gap-2.5 sm:gap-4">
        {isDemo && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs">
            <span className="hidden sm:inline font-semibold text-blue-700">Demo:</span>
            <select
              aria-label="Pilih peran demo"
              value={currentRole || "PRODUCER_ADMIN"}
              onChange={(e) => handleSwitch(e.target.value)}
              className="bg-transparent font-medium text-blue-900 outline-none cursor-pointer text-xs"
            >
              {DEMO_ROLES.map((r) => (
                <option key={r.key} value={r.key} className="bg-white text-gray-900">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <Link
          href="/mainapp/verifikasi"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-medium text-[#344054] hover:bg-gray-50 transition-colors shadow-2xs active:scale-95"
        >
          <QrCode className="size-3.5 text-[#1570EF]" />
          <span>Pindai QR</span>
        </Link>

        {/* Bell Notification */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Lihat notifikasi"
          className="group relative flex size-9 items-center justify-center rounded-lg text-[#5D6679] hover:bg-[#F9FAFB] hover:text-[#1D2939] transition-colors active:scale-95"
        >
          <Bell
            aria-hidden
            className="size-5 transition-transform duration-200 group-hover:rotate-12"
          />
          <span className="absolute top-1.5 right-1.5 flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#EF4444]" />
          </span>
        </Button>

        {/* Avatar — desktop only, mobile sudah ada di profil tab bottom bar */}
        <div className="hidden lg:flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#1570EF] to-[#60A5FA] text-xs font-bold text-white shadow-xs">
          AD
        </div>
      </div>
    </header>
  );
}
