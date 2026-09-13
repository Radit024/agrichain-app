import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { PrivyLoginButton } from "@/components/auth/privy-login-button";

export const metadata: Metadata = { title: "Masuk Petugas" };

export default function MasukPage() {
  return (
    <AuthSplitLayout
      description="Akses internal hanya untuk petugas yang menerima undangan."
      note="Masuk dengan email atau Google. MetaMask tidak diperlukan."
      title="Masuk ke akun Anda"
    >
      <div data-privy-login="">
        <PrivyLoginButton />
      </div>
    </AuthSplitLayout>
  );
}
