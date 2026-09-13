"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  QrCode,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sidebar 280px (DESIGN.md Application shell): wordmark atas, nav utama
 * tengah, Pengaturan bawah. Item aktif = brand-soft + brand. Hidden di bawah lg.
 */

const navItems = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/batch", label: "Batch", icon: Boxes },
  { href: "/serah-terima", label: "Serah-terima", icon: ClipboardCheck },
  { href: "/verifikasi", label: "Verifikasi Akses", icon: ShieldIcon },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/titik-distribusi", label: "Titik Distribusi", icon: MapPin },
] as const;

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c7 0 13-2 13-2s6 2 13 2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function InternalSidebar({
  displayName,
  email,
}: {
  displayName: string;
  email: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex"
      aria-label="Navigasi utama"
    >
      <div className="flex h-[100px] items-center gap-2.5 border-b border-border px-6">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-primary-foreground">
          <QrCode aria-hidden className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink">Agrichain</p>
          <p className="text-xs text-ink-muted">Ketertelusuran distribusi pangan</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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

      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-4">
        <Link
          href="/pengaturan"
          aria-current={pathname === "/pengaturan" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/pengaturan"
              ? "bg-brand-soft text-brand"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink",
          )}
        >
          <Settings aria-hidden className="size-[18px]" />
          Pengaturan
        </Link>
        <div className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-medium text-ink">{displayName}</span>
            {email ? <span className="block truncate text-xs text-ink-muted">{email}</span> : null}
          </span>
        </div>
      </div>
    </aside>
  );
}
