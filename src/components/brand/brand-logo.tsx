import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Logo resmi Agrilink menggunakan file public/logo.svg.
 */
export function BrandLogo({
  className = "size-8",
  alt = "Agrilink Logo",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt={alt}
      className={cn("shrink-0 object-contain", className)}
      {...props}
    />
  );
}

// Alias backward compatibility untuk komponen yang mengimpor HexagonBrandLogo
export const HexagonBrandLogo = BrandLogo;

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={cn("font-black tracking-wider text-xl text-[#1570EF]", className)}>
      AGRILINK
    </span>
  );
}
