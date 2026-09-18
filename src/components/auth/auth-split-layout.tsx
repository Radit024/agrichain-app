import type { ReactNode } from "react";
import { HexagonBrandLogo } from "@/components/brand/brand-logo";

type AuthSplitLayoutProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  note?: ReactNode;
  hideHeader?: boolean;
};

/**
 * Layout Auth Split 2 Kolom Persis 01-authentication.png:
 * - Kiri: Background putih, Logo Hexagon Besar + Wordmark KANBAN / AGRICHAIN
 * - Kanan: Form container bersih
 */
export function AuthSplitLayout({
  title,
  description,
  children,
  note,
  hideHeader = false,
}: AuthSplitLayoutProps) {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Kolom Kiri: Logo Hexagon Besar (Persis 01-authentication.png) */}
      <section className="hidden min-h-screen items-center justify-center border-r border-[#F0F1F3] bg-white lg:flex lg:px-12">
        <div className="flex flex-col items-center text-center animate-float-gentle">
          <HexagonBrandLogo className="size-40 drop-shadow-sm transition-transform duration-300 hover:scale-105" />
          <p className="mt-8 text-3xl font-black tracking-widest text-[#1570EF]">AGRILINK</p>
        </div>
      </section>

      {/* Kolom Kanan: Form Login */}
      <section className="flex min-h-screen items-center justify-center bg-white px-6 py-12 sm:px-10 lg:px-12">
        <div className="w-full max-w-[380px] animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          {!hideHeader && title ? (
            <header className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-[#1D2939]">{title}</h1>
              {description ? <p className="mt-1 text-xs text-[#667085]">{description}</p> : null}
            </header>
          ) : null}

          {children}

          {note ? <div className="mt-6 text-center text-xs text-[#667085]">{note}</div> : null}
        </div>
      </section>
    </main>
  );
}
