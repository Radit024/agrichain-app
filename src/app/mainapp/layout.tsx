import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { InternalSidebar } from "@/components/shell/internal-sidebar";
import { InternalTopbar } from "@/components/shell/internal-topbar";

/**
 * Shell internal (DESIGN.md §9.2 / Figma 420:398): sidebar 280px putih +
 * topbar 100px + konten max-1128 (main 690 / gutter 22 / rail 384 + inset).
 * Guard sesi: tanpa cookie sesi valid → /masuk.
 */
export default async function InternalLayout({ children }: { children: ReactNode }) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) redirect("/masuk");

  return (
    <div className="flex min-h-screen bg-background">
      <InternalSidebar displayName={session.user.displayName} email={session.user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <InternalTopbar />
        <main className="mx-auto w-full max-w-[1128px] flex-1 px-4 py-6 sm:px-6 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
