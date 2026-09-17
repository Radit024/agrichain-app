"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Topbar 100px desktop (search 400px + notifikasi + user) dan versi mobile
 * (judul + menu). Sidebar mobile = Sheet penuh (DESIGN.md).
 */

const navItems = [
  { href: "/mainapp/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/mainapp/batch", label: "Batch", icon: Boxes },
  { href: "/mainapp/serah-terima", label: "Serah-terima", icon: ClipboardCheck },
  { href: "/mainapp/verifikasi", label: "Verifikasi Akses", icon: ShieldCheck },
  { href: "/mainapp/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/mainapp/titik-distribusi", label: "Titik Distribusi", icon: MapPin },
  { href: "/mainapp/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

export function InternalTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = navItems.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/masuk");
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[100px] items-center gap-6 border-b border-border bg-card px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <Button
            aria-label="Buka menu navigasi"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            size="icon"
            variant="outline"
            className="size-10 shrink-0"
          >
            <Menu aria-hidden className="size-5" />
          </Button>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-primary-foreground lg:hidden">
            <QrCode aria-hidden className="size-4" />
          </span>
        </div>

        {/* Search kontekstual 400px — desktop saja */}
        <form
          action="/mainapp/batch"
          className="hidden w-full max-w-[400px] md:block"
          role="search"
        >
          <label htmlFor="topbar-search" className="sr-only">
            Cari batch, lokasi, atau ID publik
          </label>
          <input
            id="topbar-search"
            name="q"
            type="search"
            placeholder="Cari batch, lokasi, atau ID publik"
            className="h-10 w-full rounded-lg border border-input bg-surface-muted px-3.5 text-sm text-ink placeholder:text-ink-muted focus-visible:bg-card focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
        </form>

        <span className="truncate text-base font-semibold text-ink md:hidden">
          {current?.label ?? "Agrichain"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/mainapp/verifikasi" className="hidden md:inline-flex" prefetch={false}>
            <Button size="sm" variant="outline" type="button">
              <QrCode aria-hidden className="size-4" />
              Pindai QR
            </Button>
          </Link>
          <Button
            onClick={() => void logout()}
            size="sm"
            variant="outline"
            className="hidden md:inline-flex"
          >
            <LogOut aria-hidden className="size-4" />
            Keluar
          </Button>
        </div>
      </header>

      {/* Sheet mobile — full-height drawer */}
      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-card shadow-[0_12px_32px_rgba(16,42,51,0.14)]">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-semibold text-ink">Menu</span>
              <Button
                aria-label="Tutup menu"
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setMenuOpen(false)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-[18px]" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-3">
              <Button onClick={() => void logout()} variant="outline" className="w-full">
                <LogOut aria-hidden className="size-4" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
