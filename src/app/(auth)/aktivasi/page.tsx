import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { InvitationActivationForm } from "@/components/auth/invitation-activation-form";

export const metadata: Metadata = { title: "Aktivasi Undangan" };

export default async function AktivasiPage({ searchParams }: PageProps<"/aktivasi">) {
  const token = (await searchParams).token;

  return (
    <AuthSplitLayout
      description="Konfirmasikan identitas penerima sebelum akun internal diaktifkan."
      note="Undangan tidak dikenal atau kedaluwarsa tidak membuka pendaftaran mandiri."
      title="Aktifkan undangan"
    >
      {typeof token === "string" && token.length >= 16 ? (
        <InvitationActivationForm invitationToken={token} />
      ) : (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-3 text-sm leading-5 text-ink">
          Tautan undangan tidak valid atau kedaluwarsa. Hubungi administrator organisasi Anda.
        </div>
      )}
    </AuthSplitLayout>
  );
}
