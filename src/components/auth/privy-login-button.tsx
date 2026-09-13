"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export function PrivyLoginButton() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard");
    }
  }, [authenticated, ready, router]);

  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <p className="text-sm text-ink-muted">Konfigurasi login belum tersedia.</p>;
  }

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
