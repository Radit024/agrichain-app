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
      router.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Undangan tidak dapat diaktivasi.");
    } finally {
      setPending(false);
    }
  }

  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID)
    return <p className="text-sm text-ink-muted">Konfigurasi login belum tersedia.</p>;
  if (!authenticated)
    return (
      <Button className="w-full" onClick={login}>
        Masuk untuk melanjutkan
      </Button>
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void activate();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="activation-name">Nama tampilan</Label>
        <Input
          id="activation-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="activation-email">Email undangan</Label>
        <Input
          id="activation-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Mengaktivasi…" : "Aktivasi akun"}
      </Button>
    </form>
  );
}
