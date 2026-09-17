import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { PrivyLoginButton } from "@/components/auth/privy-login-button";

export const metadata: Metadata = { title: "Masuk Petugas" };

export default function MasukPage() {
  return (
    <AuthSplitLayout hideHeader>
      <div data-privy-login="">
        <PrivyLoginButton />
      </div>
    </AuthSplitLayout>
  );
}
