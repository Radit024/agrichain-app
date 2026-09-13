# Privy Dashboard Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirect authenticated Privy users from `/masuk` to `/dashboard` without rendering an account-management action.

**Architecture:** `PrivyLoginButton` stays the sole browser-only authentication boundary. It reads `ready` and `authenticated` from `usePrivy()` and uses Next.js `useRouter()` in an effect to replace the sign-in history entry after Privy has initialized a valid session.

**Tech Stack:** Next.js App Router, React 19 hooks, `next/navigation`, `@privy-io/react-auth`, Vitest.

---

## File structure

- Modify: `src/components/auth/privy-login-button.tsx` — schedule the authenticated redirect and show its progress state.
- Test: `tests/integration/auth.test.ts` — retain the importability guard for the client boundary.

### Task 1: Redirect authenticated sessions

**Files:**

- Modify: `src/components/auth/privy-login-button.tsx:1-25`
- Test: `tests/integration/auth.test.ts:38-41`

- [ ] **Step 1: Confirm the existing client-module regression test is green**

Run: `npm test -- tests/integration/auth.test.ts`

Expected: PASS; `PrivyLoginButton` is importable under the established Vitest module boundary.

- [ ] **Step 2: Add the redirect effect**

Replace the component implementation with:

```tsx
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
```

- [ ] **Step 3: Run lint and the complete test suite**

Run: `npm run lint && npm test`

Expected: PASS with no hook-dependency warning, type error, or test regression.

- [ ] **Step 4: Build the application**

Run: `npm run build`

Expected: PASS; `/masuk` compiles as a server route with only the login control as a client boundary.

- [ ] **Step 5: Commit the redirect**

```bash
git add src/components/auth/privy-login-button.tsx tests/integration/auth.test.ts
git commit -m "feat: redirect Privy sessions to dashboard"
```
