"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getEmbeddedConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InvitationActivationForm({ invitationToken }: { invitationToken: string }) {
  const router = useRouter();
  const { authenticated, getAccessToken, login } = usePrivy();
  const { wallets } = useWallets();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function activate() {
    setPending(true);
    setMessage(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Sesi Privy belum tersedia.");

      const wallet = getEmbeddedConnectedWallet(wallets);
      const response = await fetch("/api/invitations/activate", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          token: invitationToken,
          email,
          displayName,
          walletAddress: wallet?.address,
        }),
      });
      if (!response.ok) throw new Error("Undangan tidak dapat diaktivasi.");

      router.replace("/mainapp/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Undangan tidak dapat diaktivasi.");
    } finally {
      setPending(false);
    }
  }

  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm leading-5 text-ink-muted">
        Konfigurasi login belum tersedia.
      </p>
    );
  }

  if (!authenticated) {
    return (
      <Button className="h-10 w-full" onClick={login}>
        Lanjutkan dengan email atau Google
      </Button>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void activate();
      }}
    >
      <div className="grid gap-1.5">
        <Label className="text-xs font-medium text-ink" htmlFor="activation-name">
          Nama tampilan
        </Label>
        <Input
          className="h-10"
          id="activation-name"
          onChange={(event) => setDisplayName(event.target.value)}
          required
          value={displayName}
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs font-medium text-ink" htmlFor="activation-email">
          Email undangan
        </Label>
        <Input
          className="h-10"
          id="activation-email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      {message ? (
        <p
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm leading-5 text-ink"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "Mengaktifkan akun…" : "Aktifkan akun"}
      </Button>
    </form>
  );
}
