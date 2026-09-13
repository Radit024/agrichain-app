# Privy Login Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/masuk` Privy placeholder with a ready-aware control that starts the Privy login modal.

**Architecture:** Keep the route as a Server Component and add a small Client Component beneath the existing `AppPrivyProvider`. The component reads the browser-safe App ID only to select its unavailable-configuration state; `usePrivy()` supplies SDK readiness and the `login()` callback.

**Tech Stack:** Next.js App Router, React 19, TypeScript, `@privy-io/react-auth`, Base UI button wrapper, Vitest.

---

## File structure

- Create: `src/components/auth/privy-login-button.tsx` — client-side Privy SDK boundary and button states.
- Modify: `src/app/(auth)/masuk/page.tsx` — replace static placeholder paragraph with the new component.
- Modify: `tests/integration/auth.test.ts` — verify the client component module stays importable with Privy mocked, using the existing auth-test mock boundary.

### Task 1: Add the isolated client login component

**Files:**

- Create: `src/components/auth/privy-login-button.tsx`
- Test: `tests/integration/auth.test.ts`

- [ ] **Step 1: Write the failing importability test**

Append this test after the existing Privy module mock in `tests/integration/auth.test.ts`:

```ts
it("exports the Privy login control", async () => {
  const module = await import("@/components/auth/privy-login-button");
  expect(module.PrivyLoginButton).toBeTypeOf("function");
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/integration/auth.test.ts`

Expected: FAIL because `@/components/auth/privy-login-button` does not exist.

- [ ] **Step 3: Write the minimal component**

Create `src/components/auth/privy-login-button.tsx`:

```tsx
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export function PrivyLoginButton() {
  const { ready, authenticated, login } = usePrivy();

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

  return (
    <Button className="w-full" onClick={login}>
      {authenticated ? "Buka akun Privy" : "Masuk dengan email atau Google"}
    </Button>
  );
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/integration/auth.test.ts`

Expected: PASS with the existing authentication tests and the new test green.

- [ ] **Step 5: Commit the component and regression test**

```bash
git add src/components/auth/privy-login-button.tsx tests/integration/auth.test.ts
git commit -m "feat: add Privy login control"
```

### Task 2: Place the control on the sign-in page

**Files:**

- Modify: `src/app/(auth)/masuk/page.tsx:1-59`

- [ ] **Step 1: Replace the static placeholder with the component**

Add this import below the metadata import:

```tsx
import { PrivyLoginButton } from "@/components/auth/privy-login-button";
```

Replace the `<p>` inside the `data-privy-login` container with:

```tsx
<PrivyLoginButton />
```

- [ ] **Step 2: Run static checks**

Run: `npm run lint`

Expected: PASS with no lint errors in the new client component or login route.

- [ ] **Step 3: Run the test suite**

Run: `npm test`

Expected: PASS with all unit and integration tests green.

- [ ] **Step 4: Verify the production client/server build**

Run: `npm run build`

Expected: PASS; `/masuk` compiles with a client boundary and no server-only Privy verification variable enters the browser bundle.

- [ ] **Step 5: Commit the route integration**

```bash
git add src/app/(auth)/masuk/page.tsx
git commit -m "feat: render Privy login on sign-in page"
```
