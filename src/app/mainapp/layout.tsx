import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_SESSION_COOKIE, readAppSession } from "@/server/auth/app-session";
import { InternalSidebar } from "@/components/shell/internal-sidebar";
import { InternalTopbar } from "@/components/shell/internal-topbar";
import { MobileBottomBar } from "@/components/shell/mobile-bottom-bar";
import { PageTransition } from "@/components/motion/motion-container";

/**
 * Shell internal (DESIGN.md §9.2 / Figma 420:398): sidebar 280px putih +
 * topbar 100px + konten max-1128 (main 690 / gutter 22 / rail 384 + inset).
 * Mobile: bottom bar menggantikan hamburger/drawer.
 * Guard sesi: tanpa cookie sesi valid → /masuk.
 */
export default async function InternalLayout({ children }: { children: ReactNode }) {
  const session = await readAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value);
  if (!session) redirect("/masuk");

  const isDemo = session.user.did.startsWith("did:privy:seed:");
  const currentRole = session.memberships[0]?.role;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <InternalSidebar displayName={session.user.displayName} email={session.user.email} />
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden lg:pl-[260px]">
        <InternalTopbar isDemo={isDemo} currentRole={currentRole} />
        {/* pb-16 mobile: beri ruang untuk bottom bar (h-16). pb-0 di lg karena ada sidebar */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-16 lg:pb-0">
          <PageTransition className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</PageTransition>
        </main>
      </div>
      {/* Bottom bar — hanya tampil di mobile (hidden lg) */}
      <MobileBottomBar displayName={session.user.displayName} email={session.user.email} />
    </div>
  );
}
