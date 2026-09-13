import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";

/**
 * Shell internal — layout penuh (sidebar 280px + topbar 100px) dibangun di
 * Fase H; guard sesi penuh dilakukan per-action/route di server layer.
 */
export default async function InternalLayout({ children }: { children: ReactNode }) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) redirect("/masuk");
  return <div className="min-h-screen bg-background">{children}</div>;
}
