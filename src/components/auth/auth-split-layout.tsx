import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  note?: ReactNode;
};

export function AuthSplitLayout({ title, description, children, note }: AuthSplitLayoutProps) {
  return (
    <main className="min-h-svh bg-white lg:grid lg:grid-cols-2">
      <section className="hidden min-h-svh items-center justify-center border-r border-border lg:flex lg:px-12">
        <BrandPresentation />
      </section>

      <section className="flex min-h-svh items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-[360px]">
          <div className="mb-10 lg:hidden">
            <CompactBrand />
          </div>
          <header className="mb-7 text-center">
            <div className="mx-auto mb-4 lg:hidden">
              <AgrichainMark className="size-9" />
            </div>
            <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.02em] text-ink">
              {title}
            </h1>
            <p className="mt-2 text-xs leading-[18px] text-ink-muted">{description}</p>
          </header>
          <div className="space-y-5">{children}</div>
          {note ? (
            <div className="mt-5 text-center text-xs leading-[18px] text-ink-muted">{note}</div>
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
