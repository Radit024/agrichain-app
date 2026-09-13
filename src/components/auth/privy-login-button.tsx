"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

type SessionState = "idle" | "error";

export function PrivyLoginButton() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm leading-5 text-ink-muted">
        Konfigurasi login belum tersedia.
      </p>
    );
  }

  return <PrivyLoginControl />;
}

function PrivyLoginControl() {
  const router = useRouter();
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [sessionState, setSessionState] = useState<SessionState>("idle");

  const syncSession = useCallback(async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Access token Privy tidak tersedia.");

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Sesi aplikasi belum dapat dibuat.");

      router.replace("/dashboard");
    } catch {
      setSessionState("error");
    }
  }, [getAccessToken, router]);

  useEffect(() => {
    if (!ready || !authenticated) return;

    const timer = window.setTimeout(() => void syncSession(), 0);
    return () => window.clearTimeout(timer);
  }, [authenticated, ready, syncSession]);

  if (!ready) {
    return (
      <Button className="h-10 w-full" disabled>
        Menyiapkan login…
      </Button>
    );
  }

  if (authenticated && sessionState !== "error") {
    return (
      <p
        className="flex h-10 items-center justify-center gap-2 text-sm text-ink-muted"
        role="status"
      >
        <span
          aria-hidden="true"
          className="size-3 animate-spin rounded-full border-2 border-brand border-t-transparent"
        />
        Menyiapkan sesi Anda…
      </p>
    );
  }

  if (authenticated && sessionState === "error") {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger-soft p-3" role="alert">
        <p className="text-sm leading-5 text-ink">Sesi belum dapat disiapkan. Coba lagi.</p>
        <Button
          className="mt-3 h-8"
          onClick={() => {
            setSessionState("idle");
            void syncSession();
          }}
          size="sm"
          variant="outline"
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <Button className="h-10 w-full" onClick={login}>
      Lanjutkan dengan email atau Google
    </Button>
  );
}
