import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { PrivyLoginButton } from "@/components/auth/privy-login-button";

import { DemoLoginCard } from "@/components/auth/demo-login-card";

export const metadata: Metadata = { title: "Masuk Petugas" };

export default function MasukPage() {
  return (
    <AuthSplitLayout hideHeader>
      <div className="w-full space-y-4">
        {/* Akun Demo Full Data Showcase */}
        <DemoLoginCard />

        <div className="relative flex items-center justify-center pt-2">
          <div className="border-t border-[#E4E7EC] w-full" />
          <span className="bg-white px-2.5 text-[10px] font-semibold text-[#858D9D] uppercase tracking-wider shrink-0">
            atau login resmi
          </span>
          <div className="border-t border-[#E4E7EC] w-full" />
        </div>

        <div data-privy-login="">
          <PrivyLoginButton />
        </div>
      </div>
    </AuthSplitLayout>
  );
}
