"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * PageTransition — Pembungkus konten rute yang ringan dan responsif.
 * Menghilangkan `key={pathname}` agar React TIDAK menghancurkan dan membangun
 * ulang seluruh DOM tree pada setiap navigasi, sehingga navigasi instan (<16ms)
 * dan bebas lag.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full animate-in fade-in-50 duration-150 ease-out", className)}>
      {children}
    </div>
  );
}

/**
 * StaggerContainer — Kontainer yang membungkus konten tanpa menyembunyikan SSR
 * dan tanpa memblokir thread JavaScript.
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
 * StaggerItem — Elemen grid/item layout yang bersih dan tidak menghambat klik.
 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/**
 * MotionCard — Kartu bento dengan transisi hover berbasis GPU CSS compositor
 * (tanpa whileTap agar klik pada link/tombol di dalam tabel tidak terganggu/meleset).
 */
export function MotionCard({
  children,
  className,
  hoverLift = true,
}: {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-150 ease-out",
        hoverLift && "hover:border-[#E4E7EC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {children}
    </div>
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
