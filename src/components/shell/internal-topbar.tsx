"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ShoppingCart,
  BarChart3,
  UserCircle2,
  Package,
  Store,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  QrCode,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HexagonBrandLogo, BrandWordmark } from "@/components/brand/brand-logo";

/**
 * Topbar presisi persis foto referensi 02-dashboard.png:
 * - Search bar rounded dengan placeholder "Search product, supplier, order"
 * - Bell notification button
 * - User avatar circle
 * - Responsive mobile drawer
 */

const navItems = [
  { href: "/mainapp/dashboard", label: "Dashboard", icon: Home },
  { href: "/mainapp/batch", label: "Inventory", icon: ShoppingCart },
  { href: "/mainapp/laporan", label: "Reports", icon: BarChart3 },
  { href: "/mainapp/titik-distribusi", label: "Suppliers", icon: UserCircle2 },
  { href: "/mainapp/serah-terima", label: "Orders", icon: Package },
  { href: "/mainapp/pengaturan", label: "Manage Store", icon: Store },
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
    window.location.href = "/masuk?logout=1";
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
            <span className="font-bold text-base text-[#1570EF]">AGRICHAIN</span>
          </div>
        </div>

        {/* Kotak Pencarian Persis Referensi: Search product, supplier, order */}
        <form
          action="/mainapp/batch"
          className="relative hidden w-full max-w-[420px] md:block"
          role="search"
        >
          <label htmlFor="topbar-search" className="sr-only">
            Search product, supplier, order
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
              placeholder="Search product, supplier, order"
              className="h-10 w-full rounded-lg border border-[#D0D5DD] bg-white pl-10 pr-3.5 text-sm text-[#1D2939] placeholder-[#858D9D] transition-colors focus:border-[#1570EF] focus:outline-none focus:ring-1 focus:ring-[#1570EF]"
            />
          </div>
        </form>

        {/* Sisi Kanan: Lonceng Notifikasi & Avatar User */}
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/mainapp/verifikasi"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-medium text-[#344054] hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <QrCode className="size-3.5 text-[#1570EF]" />
            <span>Pindai QR</span>
          </Link>

          {/* Bell Notification Button */}
          <button
            type="button"
            aria-label="Lihat notifikasi"
            className="relative flex size-9 items-center justify-center rounded-lg text-[#5D6679] hover:bg-[#F9FAFB] hover:text-[#1D2939] transition-colors"
          >
            <Bell aria-hidden className="size-5" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#EF4444]" />
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
      {menuOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative flex w-[280px] max-w-full flex-col bg-white p-5 shadow-2xl">
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
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
