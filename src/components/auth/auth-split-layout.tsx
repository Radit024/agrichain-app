import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  note?: ReactNode;
  hideHeader?: boolean;
};

export function AuthSplitLayout({
  title,
  description,
  children,
  note,
  hideHeader = false,
}: AuthSplitLayoutProps) {
  return (
    <main className="min-h-svh bg-white lg:grid lg:grid-cols-2">
      <section className="hidden min-h-svh items-center justify-center border-r border-border lg:flex lg:px-12 bg-white">
        <BrandPresentation />
      </section>

      <section className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#fafafc] px-6 py-10 sm:px-10 lg:px-12">
        {/* Soft ambient gradient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-rose-100/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-blue-100/30 blur-3xl"
        />

        <div className="relative z-10 w-full max-w-[390px]">
          <div className="mb-8 lg:hidden">
            <CompactBrand />
          </div>
          {!hideHeader && title ? (
            <header className="mb-7 text-left">
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">
                {title}
              </h1>
              {description ? (
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{description}</p>
              ) : null}
            </header>
          ) : null}
          <div>{children}</div>
          {note ? (
            <div className="mt-6 text-center text-xs leading-[18px] text-ink-muted">{note}</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function BrandPresentation() {
  return (
    <div className="flex max-w-sm flex-col items-center text-center">
      <AgrichainMark className="size-32" />
      <p className="mt-5 text-[25px] font-semibold tracking-[0.09em] text-brand">AGRICHAIN</p>
      <p className="mt-3 max-w-[280px] text-sm leading-5 text-ink-muted">
        Ketertelusuran distribusi pangan yang dapat diaudit
      </p>
    </div>
  );
}

function CompactBrand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <AgrichainMark className="size-8" />
      <span className="text-base font-semibold tracking-[-0.02em] text-ink">Agrichain</span>
    </div>
  );
}

function AgrichainMark({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 39.2 64 14l44 25.2v49.6L64 114 20 88.8V39.2Z" fill="#0F96C7" />
      <path d="M49.5 76.2 77.8 47.9" stroke="white" strokeLinecap="round" strokeWidth="9" />
      <path d="m69.5 31.5 13.8 13.8-45 45-13.8-13.8 45-45Z" fill="#16C784" />
      <path d="m43.6 94.8 42.1-42.1 15.2 15.2-42.1 42.1-15.2-15.2Z" fill="white" />
    </svg>
  );
}
