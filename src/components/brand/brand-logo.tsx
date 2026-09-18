import type { SVGProps } from "react";

/**
 * Logo resmi Heksagon Cyan/Biru dengan Centang Hijau
 * Persis seperti pada foto referensi 01-authentication.png dan 02-dashboard.png.
 */
export function HexagonBrandLogo({ className = "size-8", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Heksagon Cyan/Biru */}
      <path d="M24 4L42 14.4V35.2L24 45.6L6 35.2V14.4L24 4Z" fill="#0EA5E9" />
      <path d="M24 4L42 14.4V35.2L24 45.6L6 35.2V14.4L24 4Z" fill="url(#hexGradient)" />
      {/* Garis Potongan Putih di Tengah */}
      <path
        d="M13 28L21 36L35 15"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Centang Hijau Menonjol ke Kanan Atas */}
      <path
        d="M14 26L21 33L37 13"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="hexGradient"
          x1="6"
          y1="4"
          x2="42"
          y2="45.6"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0284C7" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-black tracking-wider text-xl text-[#1570EF] ${className}`}>
      AGRICHAIN
    </span>
  );
}
