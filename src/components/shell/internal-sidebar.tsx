"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Home, Boxes, Truck, MapPin, BarChart3, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { HexagonBrandLogo, BrandWordmark } from "@/components/brand/brand-logo";

/**
 * Sidebar operasional ketertelusuran rantai pasok pangan:
 * - Menu: Dashboard, Batch, Serah-terima, Titik Distribusi, Laporan
 * - Bawah: Pengaturan, Keluar
 */

const navItems = [
  { href: "/mainapp/dashboard", label: "Dashboard", icon: Home },
  { href: "/mainapp/batch", label: "Batch", icon: Boxes },
  { href: "/mainapp/serah-terima", label: "Serah-terima", icon: Truck },
  { href: "/mainapp/titik-distribusi", label: "Titik Distribusi", icon: MapPin },
  { href: "/mainapp/laporan", label: "Laporan", icon: BarChart3 },
] as const;

export function InternalSidebar({
  displayName: _displayName,
  email: _email,
}: {
  displayName?: string;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout: privyLogout } = usePrivy();

  async function handleLogout() {
    try {
      await privyLogout();
    } catch {
      // Abaikan jika privy logout gagal atau tidak terotentikasi
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/masuk?logout=1");
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col justify-between border-r border-[#F0F1F3] bg-white lg:flex h-screen"
      aria-label="Navigasi utama"
    >
      {/* Bagian Atas: Header & Navigasi */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Brand Header */}
        <div className="flex h-[88px] shrink-0 items-center gap-3 px-7">
          <HexagonBrandLogo className="size-9 shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95" />
          <BrandWordmark />
        </div>

        {/* Nav Menu Utama */}
        <nav className="flex flex-1 flex-col gap-1.5 px-4 py-2 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/mainapp/dashboard"
                ? pathname === "/mainapp/dashboard"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 active:scale-[0.98]",
                  active
                    ? "text-[#1570EF] font-semibold"
                    : "text-[#5D6679] hover:text-[#1D2939] hover:bg-[#F9FAFB]/70",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebarActivePill"
                    className="pointer-events-none absolute inset-0 rounded-lg bg-[#EFF8FF] shadow-2xs"
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 35,
                    }}
                  />
                )}
                <Icon
                  aria-hidden
                  className={cn(
                    "relative z-10 size-5 shrink-0 transition-transform duration-150",
                    active ? "text-[#1570EF] scale-105" : "text-[#5D6679]",
                  )}
                />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bagian Bawah: Settings & Log Out (Mentok ke bawah, tanpa profil) */}
      <div className="shrink-0 flex flex-col gap-1.5 border-t border-[#F0F1F3] px-4 py-4">
        <Link
          href="/mainapp/pengaturan"
          className={cn(
            "relative flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 active:scale-[0.98]",
            pathname === "/mainapp/pengaturan"
              ? "text-[#1570EF] font-semibold"
              : "text-[#5D6679] hover:text-[#1D2939] hover:bg-[#F9FAFB]",
          )}
        >
          {pathname === "/mainapp/pengaturan" && (
            <motion.span
              layoutId="sidebarActivePill"
              className="pointer-events-none absolute inset-0 rounded-lg bg-[#EFF8FF] shadow-2xs"
              transition={{
                type: "spring",
                stiffness: 450,
                damping: 35,
              }}
            />
          )}
          <Settings
            aria-hidden
            className={cn(
              "relative z-10 size-5 shrink-0 transition-transform duration-150",
              pathname === "/mainapp/pengaturan" ? "text-[#1570EF] scale-105" : "text-[#5D6679]",
            )}
          />
          <span className="relative z-10">Pengaturan</span>
        </Link>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="group flex w-full items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium text-[#5D6679] hover:bg-[#FEF3F2] hover:text-[#EF4444] transition-colors duration-150 cursor-pointer"
        >
          <LogOut
            aria-hidden
            className="size-5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
          />
          <span>Keluar</span>
        </motion.button>
      </div>
    </aside>
  );
}
