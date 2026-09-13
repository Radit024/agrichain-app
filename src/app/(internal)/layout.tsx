import type { ReactNode } from "react";

/**
 * Shell internal — layout penuh (sidebar 280px + topbar 100px) dibangun di
 * Fase H; guard sesi penuh dilakukan per-action/route di server layer.
 */
export default function InternalLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
