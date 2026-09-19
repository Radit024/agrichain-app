"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  Home,
  Boxes,
  Truck,
  MapPin,
  FileBarChart2,
  UserCog,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { HexagonBrandLogo } from "@/components/brand/brand-logo";

/**
 * Bottom navigation bar — mobile only (hidden on lg+).
 * 5 nav items + Profile tab yang membuka bottom sheet.
 * Profile sheet berisi: Edit Profil, Pengaturan, Keluar.
 */

const navItems = [
  { href: "/mainapp/dashboard", label: "Beranda", icon: Home },
  { href: "/mainapp/batch", label: "Batch", icon: Boxes },
  { href: "/mainapp/serah-terima", label: "Serah", icon: Truck },
  { href: "/mainapp/titik-distribusi", label: "Titik", icon: MapPin },
  { href: "/mainapp/laporan", label: "Laporan", icon: FileBarChart2 },
] as const;

export function MobileBottomBar({
  displayName,
  email,
}: {
  displayName?: string;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout: privyLogout } = usePrivy();
  const [profileOpen, setProfileOpen] = useState(false);

  const isProfileZone = pathname === "/mainapp/pengaturan";
  const initial = displayName?.[0]?.toUpperCase() ?? "A";

  async function handleLogout() {
    setProfileOpen(false);
    try {
      await privyLogout();
    } catch {
      // Abaikan jika privy logout gagal
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/masuk?logout=1");
  }

  return (
    <>
      {/* ─── Bottom Navigation Bar ─── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex h-16 shrink-0 items-stretch border-t border-[#F0F1F3] bg-white lg:hidden"
        aria-label="Navigasi bawah"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/mainapp/dashboard"
              ? pathname === "/mainapp/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors duration-150 active:scale-95",
                active ? "text-[#1570EF]" : "text-[#858D9D] hover:text-[#5D6679]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative flex flex-col items-center gap-0.5">
                {active && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-[#1570EF]" />
                )}
                <Icon
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 transition-all duration-150",
                    active ? "text-[#1570EF] scale-110" : "text-[#858D9D]",
                  )}
                />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}

        {/* ─── Tab Profil ─── */}
        <button
          type="button"
          aria-label="Buka profil"
          onClick={() => setProfileOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors duration-150 active:scale-95",
            isProfileZone || profileOpen ? "text-[#1570EF]" : "text-[#858D9D] hover:text-[#5D6679]",
          )}
        >
          <div className="relative flex flex-col items-center gap-0.5">
            {(isProfileZone || profileOpen) && (
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-[#1570EF]" />
            )}
            {/* Avatar mini */}
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-150",
                isProfileZone || profileOpen
                  ? "bg-[#1570EF] text-white scale-110"
                  : "bg-[#E4E7EC] text-[#5D6679]",
              )}
            >
              {initial}
            </div>
            <span>Profil</span>
          </div>
        </button>
      </nav>

      {/* ─── Profile Bottom Sheet ─── */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl bg-white px-0 pb-0 pt-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Menu Profil</SheetTitle>

          {/* Handle */}
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-10 rounded-full bg-[#E4E7EC]" />
          </div>

          {/* ─── User Info Header ─── */}
          <div className="flex items-center gap-3.5 border-b border-[#F0F1F3] px-5 pb-4 pt-1">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#1570EF] to-[#60A5FA] text-lg font-bold text-white shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1D2939]">
                {displayName ?? "Pengguna"}
              </p>
              <p className="truncate text-xs text-[#858D9D]">{email ?? ""}</p>
            </div>
            <HexagonBrandLogo className="size-6 shrink-0 opacity-30" />
          </div>

          {/* ─── Action List ─── */}
          <div className="px-3 py-2 space-y-1">
            {/* Verifikasi Akses */}
            <Link
              href="/mainapp/verifikasi"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3.5 rounded-xl px-3 py-3.5 text-sm font-medium text-[#1D2939] transition-colors hover:bg-[#F9FAFB] active:scale-[0.98]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ECFDF3]">
                <ShieldCheck aria-hidden className="size-4.5 text-[#12B76A]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#1D2939]">Verifikasi Akses</p>
                <p className="text-xs text-[#858D9D]">
                  Pindai QR dan validasi izin operasional batch
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[#C0C5D0]" />
            </Link>

            {/* Edit Profil */}
            <Link
              href="/mainapp/pengaturan?tab=profil"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3.5 rounded-xl px-3 py-3.5 text-sm font-medium text-[#1D2939] transition-colors hover:bg-[#F9FAFB] active:scale-[0.98]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF8FF]">
                <UserCog aria-hidden className="size-4.5 text-[#1570EF]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#1D2939]">Edit Profil</p>
                <p className="text-xs text-[#858D9D]">Ubah nama, foto, dan informasi akun</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[#C0C5D0]" />
            </Link>

            {/* Pengaturan */}
            <Link
              href="/mainapp/pengaturan"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3.5 rounded-xl px-3 py-3.5 text-sm font-medium text-[#1D2939] transition-colors hover:bg-[#F9FAFB] active:scale-[0.98]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F3E8FF]">
                <Settings aria-hidden className="size-4.5 text-[#845EC2]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#1D2939]">Pengaturan</p>
                <p className="text-xs text-[#858D9D]">Notifikasi, keamanan, dan preferensi</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[#C0C5D0]" />
            </Link>
          </div>

          {/* ─── Keluar ─── */}
          <div className="border-t border-[#F0F1F3] px-3 py-2 pb-safe">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3.5 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#FEF3F2] active:scale-[0.98]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2]">
                <LogOut aria-hidden className="size-4.5 text-[#EF4444]" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-medium">Keluar</p>
                <p className="text-xs text-[#EF4444]/70">Keluar dari sesi ini</p>
              </div>
            </button>
          </div>

          {/* Safe area spacer untuk iPhone home indicator */}
          <div className="h-safe-bottom" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </SheetContent>
      </Sheet>
    </>
  );
}
