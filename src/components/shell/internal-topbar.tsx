"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Boxes,
  Truck,
  MapPin,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  QrCode,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HexagonBrandLogo, BrandWordmark } from "@/components/brand/brand-logo";

const navItems = [
  { href: "/mainapp/dashboard", label: "Dashboard", icon: Home },
  { href: "/mainapp/batch", label: "Batch", icon: Boxes },
  { href: "/mainapp/serah-terima", label: "Serah-terima", icon: Truck },
  { href: "/mainapp/titik-distribusi", label: "Titik Distribusi", icon: MapPin },
  { href: "/mainapp/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/mainapp/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

export function InternalTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout: privyLogout } = usePrivy();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    try {
      await privyLogout();
    } catch {
      // Abaikan jika privy logout gagal atau tidak terotentikasi
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/masuk?logout=1");
  }

  return (
    <>
      <header className="shrink-0 z-30 flex h-[76px] items-center justify-between border-b border-[#F0F1F3] bg-white px-6 sm:px-8">
        {/* Tombol Hamburger Mobile */}
        <div className="flex items-center gap-3 lg:hidden">
          <Button
            aria-label="Buka menu navigasi"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            size="icon"
            variant="ghost"
            className="size-9 text-[#5D6679]"
          >
            <Menu aria-hidden className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <HexagonBrandLogo className="size-6 shrink-0" />
            <span className="font-bold text-base text-[#1570EF]">AGRILINK</span>
          </div>
        </div>

        {/* Kotak Pencarian Domain Ketertelusuran */}
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
              className="pointer-events-none absolute left-3.5 size-4 text-[#858D9D]"
            />
            <input
              id="topbar-search"
              name="q"
              type="search"
              placeholder="Cari batch, komoditas, titik distribusi..."
              className="h-10 w-full rounded-lg border border-[#D0D5DD] bg-white pl-10 pr-3.5 text-sm text-[#1D2939] placeholder-[#858D9D] transition-all duration-150 focus:border-[#1570EF] focus:outline-none focus:ring-2 focus:ring-[#1570EF]/15"
            />
          </div>
        </form>

        {/* Sisi Kanan: Lonceng Notifikasi & Avatar User */}
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/mainapp/verifikasi"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-medium text-[#344054] hover:bg-gray-50 transition-colors shadow-2xs active:scale-95"
          >
            <QrCode className="size-3.5 text-[#1570EF]" />
            <span>Pindai QR</span>
          </Link>

          {/* Bell Notification Button */}
          <button
            type="button"
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
          </button>

          {/* User Profile Avatar Circle */}
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#1570EF] to-[#60A5FA] text-xs font-bold text-white shadow-xs">
              AD
            </div>
          </div>
        </div>
      </header>

      {/* Drawer Menu Mobile */}
      <AnimatePresence>
        {menuOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="relative flex w-[280px] max-w-full flex-col bg-white p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-4">
                <div className="flex items-center gap-2.5">
                  <HexagonBrandLogo className="size-7 shrink-0" />
                  <BrandWordmark />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMenuOpen(false)}
                  className="size-8 text-[#5D6679]"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <nav className="mt-4 flex flex-1 flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/mainapp/dashboard"
                      ? pathname === "/mainapp/dashboard"
                      : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-[#EFF8FF] text-[#1570EF] font-semibold"
                          : "text-[#5D6679] hover:bg-[#F9FAFB] hover:text-[#1D2939]",
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-[#F0F1F3] pt-4">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#EF4444] hover:bg-[#FEE2E2]/40 transition-colors"
                >
                  <LogOut className="size-4" />
                  <span>Keluar</span>
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
