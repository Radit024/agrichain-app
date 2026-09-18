"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

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
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.65,
      }}
      className={cn("w-full origin-top", className)}
    >
      {children}
    </motion.div>
  );
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
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.04,
            delayChildren: 0.01,
          },
        },
      }}
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem — Elemen bento card / baris konten dengan animasi pop up individual.
 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.98, y: 8 },
        show: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 28,
            mass: 0.6,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
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
