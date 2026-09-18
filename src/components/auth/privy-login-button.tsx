"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HexagonBrandLogo } from "@/components/brand/brand-logo";

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
      <p className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm leading-5 text-ink-muted">
        Konfigurasi login belum tersedia.
      </p>
    );
  }

  return <PrivyLoginControl />;
}

function PrivyLoginControl() {
  const router = useRouter();
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data?.code === "NO_ACCESS") {
          setSessionState("no-access");
          return;
        }
        setErrorMessage(data?.error || "Sesi aplikasi belum dapat dibuat.");
        throw new Error(data?.error || "Sesi aplikasi belum dapat dibuat.");
      }

      setSessionState("idle");
      setErrorMessage(null);
      router.replace("/mainapp/dashboard");
    } catch (error) {
      setSessionState(error instanceof Error && error.message === "timeout" ? "timeout" : "error");
    }
  }, [getAccessToken, router]);

  useEffect(() => {
    if (!ready || !authenticated) return;

    // Jika pengguna baru saja logout (?logout=1), jangan sinkronisasi ulang ke sesi server.
    // Lakukan logout Privy client secara tuntas agar bersih.
    if (typeof window !== "undefined") {
      const isLogout = new URLSearchParams(window.location.search).get("logout") === "1";
      if (isLogout) {
        window.history.replaceState({}, "", "/masuk");
        void logout();
        return;
      }
    }

    const timer = window.setTimeout(() => void syncSession(), 0);
    return () => window.clearTimeout(timer);
  }, [authenticated, ready, syncSession, logout]);

  const initiatePrivyLogin = useCallback(
    async (options?: Parameters<typeof login>[0]) => {
      if (loginState === "loading") return;
      setLoginState("loading");

      if (authenticated) {
        try {
          await logout();
        } catch {
          // Abaikan jika logout gagal
        }
      }

      login(options);

      clearLoginTimer();
      loginTimer.current = window.setTimeout(() => {
        setLoginState("timeout");
        toast.error("Login terlalu lama", {
          description:
            "Proses login tidak kunjung selesai. Reload halaman lalu coba lagi, atau periksa apakah ada ekstensi browser yang memblokir Privy.",
        });
      }, 60_000);
    },
    [authenticated, clearLoginTimer, login, loginState, logout],
  );

  const handleSwitchAccount = useCallback(async () => {
    clearLoginTimer();
    setLoginState("idle");
    setSessionState("idle");
    setErrorMessage(null);
    try {
      await logout();
    } catch {
      // Abaikan jika logout lokal gagal
    }
  }, [clearLoginTimer, logout]);

  useEffect(() => {
    if (authenticated) clearLoginTimer();
  }, [authenticated, clearLoginTimer]);

  const handleGoogleLogin = () => {
    initiatePrivyLogin({ loginMethods: ["google"] });
  };

  if (authenticated && sessionState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/50 p-8 text-center">
        <span
          aria-hidden="true"
          className="size-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        />
        <p className="mt-4 text-sm font-semibold text-gray-900">Menyiapkan sesi Anda…</p>
        <p className="mt-1 text-xs text-gray-500">Mengarahkan ke dasbor internal</p>
      </div>
    );
  }

  if (authenticated && sessionState === "no-access") {
    return (
      <div className="rounded-2xl border border-warning/40 bg-surface-muted p-5" role="alert">
        <p className="text-sm leading-6 text-ink">
          Akun belum diaktivasi. Gunakan tautan undangan yang diterima dari administrator organisasi
          Anda untuk mengaktifkan akun.
        </p>
        {process.env.NODE_ENV === "development" ? <DevGrantButton /> : null}
        <Button
          className="mt-4 h-10 w-full rounded-xl"
          onClick={() => void handleSwitchAccount()}
          size="sm"
          variant="outline"
        >
          Masuk dengan akun lain
        </Button>
      </div>
    );
  }

  if (authenticated && sessionState === "timeout") {
    return (
      <div className="rounded-2xl border border-warning/40 bg-surface-muted p-5" role="alert">
        <p className="text-sm leading-6 text-ink">
          Koneksi ke layanan verifikasi tersendat. Pastikan tidak ada ekstensi browser yang
          memblokir permintaan, lalu coba lagi.
        </p>
        <Button
          className="mt-4 h-10 w-full rounded-xl"
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
      <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5" role="alert">
        <p className="text-sm font-medium leading-6 text-ink">
          {errorMessage ??
            "Sesi belum dapat disiapkan. Akun Anda mungkin belum terdaftar di sistem internal."}
        </p>
        {process.env.NODE_ENV === "development" ? <DevGrantButton /> : null}
        <div className="mt-4 flex gap-2.5">
          <Button
            className="h-10 flex-1 rounded-xl"
            onClick={() => {
              setSessionState("idle");
              void syncSession();
            }}
            size="sm"
            variant="outline"
          >
            Coba lagi
          </Button>
          <Button
            className="h-10 flex-1 rounded-xl"
            onClick={() => void handleSwitchAccount()}
            size="sm"
            variant="outline"
          >
            Ganti akun
          </Button>
        </div>
      </div>
    );
  }

  if (loginState === "timeout" && !authenticated) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-surface-muted p-5" role="alert">
        <p className="text-sm leading-6 text-ink">
          Login terlampau lama. Silakan coba lagi atau muat ulang halaman.
        </p>
        <Button
          className="mt-4 h-10 w-full rounded-xl"
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
      <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5" role="alert">
        <p className="text-sm leading-6 text-ink">Autentikasi gagal. Silakan coba lagi.</p>
        <Button
          className="mt-4 h-10 w-full rounded-xl"
          onClick={() => setLoginState("idle")}
          size="sm"
          variant="outline"
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top Mini Hexagon Logo */}
      <div className="flex justify-center mb-6">
        <HexagonBrandLogo className="size-10" />
      </div>

      {/* Header Section */}
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#1D2939]">
          Masuk Petugas Rantai Pasok
        </h1>
        <p className="mt-1.5 text-xs text-[#667085]">
          Akses internal hanya untuk petugas yang menerima undangan.
        </p>
      </header>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Primary Privy Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={!ready || loginState === "loading"}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-[#1570EF] hover:bg-[#004EEB] text-sm font-semibold text-white transition-colors shadow-xs cursor-pointer disabled:opacity-60"
        >
          <GoogleIcon className="size-4.5" />
          <span>{loginState === "loading" ? "Menyiapkan login…" : "Lanjutkan dengan Google"}</span>
        </button>

        {/* Email Login via Privy */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={!ready || loginState === "loading"}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#D0D5DD] bg-white text-sm font-semibold text-[#344054] transition-colors hover:bg-gray-50 active:scale-[0.99] cursor-pointer disabled:opacity-60 shadow-2xs"
        >
          <span>Lanjutkan dengan Email</span>
        </button>

        {/* Dev Grant Access Button in dev environment */}
        {process.env.NODE_ENV !== "production" ? <DevGrantButton /> : null}
      </div>

      {/* Domain Context & Security Note */}
      <div className="mt-6 rounded-lg border border-[#F0F1F3] bg-[#F9FAFB] p-3 text-left">
        <p className="text-[11px] leading-relaxed text-[#667085]">
          Autentikasi diamankan oleh <strong>Privy</strong> dengan <em>embedded wallet</em>. Setiap
          tindakan pendaftaran batch dan serah-terima distribusi dicatat ke jejak audit on-chain.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-5"} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
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
      className="mt-3 h-9 w-full rounded-xl"
      disabled={granting}
      onClick={() => void grant()}
      size="sm"
      variant="outline"
    >
      {granting ? "Memberi akses…" : "Aktifkan akses langsung (mode pengembangan)"}
    </Button>
  );
}
