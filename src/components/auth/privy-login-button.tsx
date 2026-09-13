"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export function PrivyLoginButton() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <p className="text-sm text-ink-muted">Konfigurasi login belum tersedia.</p>;
  }
  return <PrivyLoginControl />;
}

function PrivyLoginControl() {
  const router = useRouter();
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      void (async () => {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) router.replace("/dashboard");
      })();
    }
  }, [authenticated, getAccessToken, ready, router]);

  if (!ready) {
    return (
      <Button className="w-full" disabled>
        Menyiapkan login…
      </Button>
    );
  }

  if (authenticated) {
    return <p className="text-sm text-ink-muted">Mengarahkan ke dashboard…</p>;
  }

  return (
    <Button className="w-full" onClick={login}>
      Masuk dengan email atau Google
    </Button>
  );
}
