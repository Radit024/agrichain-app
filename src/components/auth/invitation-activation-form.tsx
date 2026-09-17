"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getEmbeddedConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { User, AtSign } from "lucide-react";

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
      <p className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm leading-5 text-ink-muted">
        Konfigurasi login belum tersedia.
      </p>
    );
  }

  if (!authenticated) {
    return (
      <button
        className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 active:scale-[0.99] cursor-pointer"
        onClick={() => login()}
        type="button"
      >
        Lanjutkan dengan email atau Google
      </button>
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
      <div>
        <label
          className="mb-1.5 block text-xs font-semibold text-gray-800"
          htmlFor="activation-name"
        >
          Nama tampilan
        </label>
        <div className="relative flex items-center">
          <User className="pointer-events-none absolute left-3.5 size-4.5 text-gray-400" />
          <input
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 text-sm text-gray-900 shadow-xs transition-all placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            id="activation-name"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Masukkan nama tampilan"
            required
            type="text"
            value={displayName}
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-semibold text-gray-800"
          htmlFor="activation-email"
        >
          Email undangan
        </label>
        <div className="relative flex items-center">
          <AtSign className="pointer-events-none absolute left-3.5 size-4.5 text-gray-400" />
          <input
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 text-sm text-gray-900 shadow-xs transition-all placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            id="activation-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Masukkan email undangan"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      {message ? (
        <p
          className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm leading-5 text-ink"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <button
        className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
        disabled={pending}
        type="submit"
      >
        {pending ? "Mengaktifkan akun…" : "Aktifkan akun"}
      </button>
    </form>
  );
}
