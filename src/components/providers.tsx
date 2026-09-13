"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

/**
 * Privy = provider autentikasi internal (PRD): social login + passwordless email.
 * MetaMask TIDAK prasyarat; embedded wallet dibuat otomatis untuk pengguna
 * internal yang berwenang (createOnLogin: pengguna undangan).
 */
export function AppPrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    // Fallback dev tanpa Privy: render tanpa auth (guard server tetap menolak)
    return <>{children}</>;
  }
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: {
          createOnLogin: "users-with-link",
        },
        appearance: {
          theme: "light",
          accentColor: "#0F5965",
        },
        mfa: {
          // MFA untuk akun yang mencatat peristiwa sensitif (PRD story 31)
          enableAnchorMfa: true,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
