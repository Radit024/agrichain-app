"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  Home,
  ShoppingCart,
  BarChart3,
  UserCircle2,
  Package,
  Store,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HexagonBrandLogo, BrandWordmark } from "@/components/brand/brand-logo";

/**
 * Sidebar presisi persis foto referensi 02-dashboard.png:
 * - Logo heksagon cyan/biru + wordmark biru bold
 * - Menu: Dashboard, Inventory, Reports, Suppliers, Orders, Manage Store
 * - Bawah: Settings, Log Out
 */

const navItems = [
  { href: "/mainapp/dashboard", label: "Dashboard", icon: Home },
  { href: "/mainapp/batch", label: "Inventory", icon: ShoppingCart },
  { href: "/mainapp/laporan", label: "Reports", icon: BarChart3 },
  { href: "/mainapp/titik-distribusi", label: "Suppliers", icon: UserCircle2 },
  { href: "/mainapp/serah-terima", label: "Orders", icon: Package },
  { href: "/mainapp/pengaturan", label: "Manage Store", icon: Store },
] as const;

export function InternalSidebar({
  displayName,
  email,
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
    window.location.href = "/masuk?logout=1";
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
          <HexagonBrandLogo className="size-9 shrink-0" />
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
                  "flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "text-[#1570EF] font-semibold bg-[#EFF8FF]/60"
                    : "text-[#5D6679] hover:text-[#1D2939] hover:bg-[#F9FAFB]",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 transition-colors",
                    active ? "text-[#1570EF]" : "text-[#5D6679]",
                  )}
                />
                <span>{label}</span>
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
            "flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
            pathname === "/mainapp/pengaturan"
              ? "text-[#1570EF] font-semibold bg-[#EFF8FF]/60"
              : "text-[#5D6679] hover:text-[#1D2939] hover:bg-[#F9FAFB]",
          )}
        >
          <Settings aria-hidden className="size-5 shrink-0" />
          <span>Settings</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium text-[#5D6679] hover:bg-[#F9FAFB] hover:text-[#EF4444] transition-colors"
        >
          <LogOut aria-hidden className="size-5 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
