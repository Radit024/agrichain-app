"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type SessionState = "idle" | "error" | "no-access" | "timeout";
type LoginState = "idle" | "loading" | "error" | "timeout";

/** Bungkus promise agar tidak menggantung selamanya. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then(
        (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          window.clearTimeout(timer);
          reject(error);
        },
      )
      .catch(() => undefined);
  });
}

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
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const loginTimer = useRef<number | null>(null);

  const clearLoginTimer = useCallback(() => {
    if (loginTimer.current !== null) {
      window.clearTimeout(loginTimer.current);
      loginTimer.current = null;
    }
  }, []);

  useEffect(() => clearLoginTimer, [clearLoginTimer]);

  const syncSession = useCallback(async () => {
    try {
      const accessToken = await withTimeout(getAccessToken(), 15_000);
      if (!accessToken) throw new Error("Access token Privy tidak tersedia.");

      const response = await withTimeout(
        fetch("/api/auth/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        15_000,
      );
      if (response.status === 403) {
        setSessionState("no-access");
        return;
      }
      if (!response.ok) throw new Error("Sesi aplikasi belum dapat dibuat.");

      setSessionState("idle");
      router.replace("/mainapp/dashboard");
    } catch (error) {
      setSessionState(error instanceof Error && error.message === "timeout" ? "timeout" : "error");
    }
  }, [getAccessToken, router]);

  useEffect(() => {
    if (!ready || !authenticated) return;

    const timer = window.setTimeout(() => void syncSession(), 0);
    return () => window.clearTimeout(timer);
  }, [authenticated, ready, syncSession]);

  const handleLogin = useCallback(() => {
    if (loginState === "loading") return;
    setLoginState("loading");
    login();

    clearLoginTimer();
    loginTimer.current = window.setTimeout(() => {
      setLoginState("timeout");
      toast.error("Login terlalu lama", {
        description:
          "Proses login tidak kunjung selesai. Reload halaman lalu coba lagi, atau periksa apakah ada ekstensi browser yang memblokir Privy.",
      });
    }, 60_000);
  }, [clearLoginTimer, login, loginState]);

  useEffect(() => {
    if (authenticated) clearLoginTimer();
  }, [authenticated, clearLoginTimer]);

  if (!ready) {
    return (
      <Button className="h-10 w-full" disabled>
        Menyiapkan login…
      </Button>
    );
  }

  if (loginState === "loading" && !authenticated) {
    return (
      <Button className="h-10 w-full" disabled>
        Memproses login…
      </Button>
    );
  }

  if (loginState === "timeout" && !authenticated) {
    return (
      <div className="rounded-lg border border-warning/40 bg-surface-muted p-3" role="alert">
        <p className="text-sm leading-5 text-ink">
          Login terlampau lama. Reload halaman lalu coba lagi, atau periksa apakah ekstensi browser
          memblokir Privy.
        </p>
        <Button
          className="mt-3 h-8"
          onClick={() => setLoginState("idle")}
          size="sm"
          variant="outline"
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  if (loginState === "error" && !authenticated) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger-soft p-3" role="alert">
        <p className="text-sm leading-5 text-ink">Autentikasi gagal. Silakan coba lagi.</p>
        <Button
          className="mt-3 h-8"
          onClick={() => setLoginState("idle")}
          size="sm"
          variant="outline"
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  if (authenticated && sessionState === "idle") {
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

  if (authenticated && sessionState === "no-access") {
    return (
      <div className="rounded-lg border border-warning/40 bg-surface-muted p-3" role="alert">
        <p className="text-sm leading-5 text-ink">
          Akun belum diaktivasi. Gunakan tautan undangan yang diterima dari administrator organisasi
          Anda untuk mengaktifkan akun.
        </p>
        {process.env.NODE_ENV === "development" ? <DevGrantButton /> : null}
        <Button className="mt-3 h-8" onClick={handleLogin} size="sm" variant="outline">
          Masuk dengan akun lain
        </Button>
      </div>
    );
  }

  if (authenticated && sessionState === "timeout") {
    return (
      <div className="rounded-lg border border-warning/40 bg-surface-muted p-3" role="alert">
        <p className="text-sm leading-5 text-ink">
          Koneksi ke layanan verifikasi tersendat. Pastikan tidak ada ekstensi browser yang
          memblokir permintaan, lalu coba lagi.
        </p>
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
    <Button className="h-10 w-full" onClick={handleLogin}>
      Lanjutkan dengan email atau Google
    </Button>
  );
}

/** Hanya muncul di dev: beri akses langsung akun yang sedang login (jalur 2). */
function DevGrantButton() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [granting, setGranting] = useState(false);

  const grant = useCallback(async () => {
    setGranting(true);
    try {
      const accessToken = await withTimeout(getAccessToken(), 15_000);
      if (!accessToken) throw new Error("Sesi Privy belum tersedia.");
      const response = await withTimeout(
        fetch("/api/dev/grant-access", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        15_000,
      );
      if (!response.ok) throw new Error("Akses gagal diberikan.");
      router.replace("/mainapp/dashboard");
    } catch {
      toast.error("Akses gagal diberikan", {
        description: "Pastikan server berjalan dalam mode pengembangan.",
      });
    } finally {
      setGranting(false);
    }
  }, [getAccessToken, router]);

  return (
    <Button
      className="mt-3 h-8"
      disabled={granting}
      onClick={() => void grant()}
      size="sm"
      variant="outline"
    >
      {granting ? "Memberi akses…" : "Aktifkan akses langsung (mode pengembangan)"}
    </Button>
  );
}
