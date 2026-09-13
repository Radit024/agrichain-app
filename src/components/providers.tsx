"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

/**
 * Privy = provider autentikasi internal (PRD): social login + passwordless email.
 * MetaMask TIDAK prasyarat; embedded wallet Ethereum dibuat untuk pengguna
 * internal yang berwenang (createOnLogin di ethereum config).
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
        loginMethods: ["email", "google"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        appearance: {
          theme: "light",
          accentColor: "#0F5965",
        },
        mfa: {},
      }}
    >
      {children}
    </PrivyProvider>
  );
}
