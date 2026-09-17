"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { User, AtSign, KeyRound } from "lucide-react";
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
      <p className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm leading-5 text-ink-muted">
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
  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        throw new Error(data?.error || "Sesi aplikasi belum dapat dibuat.");
      }

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

  const initiatePrivyLogin = useCallback(
    (options?: Parameters<typeof login>[0]) => {
      if (loginState === "loading") return;
      setLoginState("loading");
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
    [clearLoginTimer, login, loginState],
  );

  useEffect(() => {
    if (authenticated) clearLoginTimer();
  }, [authenticated, clearLoginTimer]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Masukkan alamat email yang valid.");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Kata sandi harus minimal 8 karakter.");
      return;
    }

    // Sambungkan ke Privy dengan prefill email pengguna
    initiatePrivyLogin({ prefill: { type: "email", value: email } });
  };

  const handleSocialLogin = (method: "google" | "apple") => {
    initiatePrivyLogin({ loginMethods: [method] });
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
          onClick={() => initiatePrivyLogin()}
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
          Sesi belum dapat disiapkan. Akun Anda mungkin belum terdaftar di sistem internal.
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
            onClick={() => initiatePrivyLogin()}
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
      {/* Header Section matching reference image */}
      <header className="mb-6 text-left">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
          {isSignUp ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-1.5 text-sm text-gray-400">
          {isSignUp
            ? "Start your 30-day free trial. Cancel anytime."
            : "Welcome back! Please enter your details."}
        </p>
      </header>

      {/* Form Section */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {isSignUp ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-800" htmlFor="auth-name">
              Name
            </label>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-3.5 size-4.5 text-gray-400" />
              <input
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 text-sm text-gray-900 shadow-xs transition-all placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                id="auth-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required={isSignUp}
                type="text"
                value={name}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-800" htmlFor="auth-email">
            Email
          </label>
          <div className="relative flex items-center">
            <AtSign className="pointer-events-none absolute left-3.5 size-4.5 text-gray-400" />
            <input
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 text-sm text-gray-900 shadow-xs transition-all placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              id="auth-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              type="email"
              value={email}
            />
          </div>
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-semibold text-gray-800"
            htmlFor="auth-password"
          >
            Password
          </label>
          <div className="relative flex items-center">
            <KeyRound className="pointer-events-none absolute left-3.5 size-4.5 text-gray-400" />
            <input
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 text-sm text-gray-900 shadow-xs transition-all placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              id="auth-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "Create a password" : "Enter your password"}
              required
              type="password"
              value={password}
            />
          </div>
          {isSignUp ? (
            <p className="mt-1.5 text-xs text-gray-400">Must be at least 8 characters</p>
          ) : null}
        </div>

        {/* Primary CTA */}
        <button
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
          disabled={!ready || loginState === "loading"}
          type="submit"
        >
          {loginState === "loading" ? "Memproses…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200/80" />
        </div>
        <span className="relative bg-[#fafafc] px-3 text-xs text-gray-400">or</span>
      </div>

      {/* Social Logins */}
      <div className="space-y-2.5">
        <button
          className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-gray-200/50 bg-[#f3f4f6] text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200/80 active:scale-[0.99] cursor-pointer"
          disabled={!ready || loginState === "loading"}
          onClick={() => handleSocialLogin("google")}
          type="button"
        >
          <GoogleIcon className="size-4.5" />
          <span>{isSignUp ? "Sign up with Google" : "Sign in with Google"}</span>
        </button>

        <button
          className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-gray-200/50 bg-[#f3f4f6] text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200/80 active:scale-[0.99] cursor-pointer"
          disabled={!ready || loginState === "loading"}
          onClick={() => handleSocialLogin("apple")}
          type="button"
        >
          <AppleIcon className="size-4.5" />
          <span>{isSignUp ? "Sign up with Apple ID" : "Sign in with Apple ID"}</span>
        </button>
      </div>

      {/* Footer Switch */}
      <p className="mt-6 text-center text-xs text-gray-400">
        {isSignUp ? "Have an account? " : "Don't have an account? "}
        <button
          className="font-semibold text-blue-600 hover:underline cursor-pointer"
          onClick={() => setIsSignUp(!isSignUp)}
          type="button"
        >
          {isSignUp ? "Try to sign in" : "Create account"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-4.5"} viewBox="0 0 24 24">
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

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-4.5"} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.61 1.34-.55.63-1.03 1.68-.9 2.71 1 .08 2.02-.51 2.58-1.2" />
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
