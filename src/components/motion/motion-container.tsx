"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * PageTransition — Pembungkus konten rute utama yang memicu animasi pop up
 * yang halus, snappy, dan GPU-accelerated pada setiap perpindahan halaman (route change).
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full origin-top", className)}>{children}</div>;
}

/**
 * StaggerContainer — Kontainer kartu fitur yang memicu kaskade pop up
 * berurutan saat halaman dimuat.
 */
export function StaggerContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

/**
 * StaggerItem — Elemen bento card / baris konten dengan struktur flex/grid stabil.
 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/**
 * MotionCard — Kartu bento dengan transisi hover berbasis GPU CSS compositor
 * (tanpa whileTap agar klik pada link/tombol di dalam tabel tidak terganggu/meleset).
 * Terintegrasi dengan shadcn Card.
 */
export function MotionCard({
  children,
  className,
  hoverLift = true,
  ...props
}: React.ComponentProps<typeof Card> & {
  hoverLift?: boolean;
}) {
  return (
    <Card
      className={cn(
        "transition-all duration-150 ease-out py-0 gap-0 ring-0",
        hoverLift && "hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

/**
 * MotionButton — Tombol interaktif yang memanfaatkan fisika sentuhan Motion
 * secara presisi tanpa mengganggu komponen lain.
 */
export function MotionButton({ children, className, ...props }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * ScanlineBeam — Garis laser pemindai visual untuk viewfinder kamera QR.
 */
export function ScanlineBeam({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#1570EF] to-transparent shadow-[0_0_8px_#1570EF] animate-scanline z-20",
        className,
      )}
    />
  );
}
