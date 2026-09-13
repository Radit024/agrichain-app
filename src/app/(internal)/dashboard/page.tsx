import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ringkasan Operasional" };

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-ink">Ringkasan Operasional</h1>
      <p className="mt-2 text-sm text-ink-muted">Dashboard penuh dibangun pada Fase H–I.</p>
    </main>
  );
}
