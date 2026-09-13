# Authentication UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the login and invitation-activation routes match the supplied Figma-derived authentication composition without changing Privy or invitation authorization rules.

**Architecture:** A shared server-rendered `AuthSplitLayout` owns the responsive two-column composition and a small Agrichain mark. Each route supplies only its title, explanatory copy, and form content. The Privy control owns session synchronisation state so it never leaves a fixed-height empty surface.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS 4, shadcn/Base UI primitives, Privy.

---

### Task 1: Shared authentication composition

**Files:**

- Create: `src/components/auth/auth-split-layout.tsx`
- Modify: `src/app/(auth)/masuk/page.tsx`
- Modify: `src/app/(auth)/aktivasi/page.tsx`

- [ ] Add a reusable white desktop split layout with a centred product mark on the identity side and a 360 px content column on the form side.
- [ ] Use the layout from both routes; preserve `/masuk`, `/aktivasi`, and their existing metadata/search-param behavior.
- [ ] Collapse to a single-column mobile form with a compact wordmark, 16 px side insets, and no permanent blank panel.

### Task 2: Compact Privy and activation states

**Files:**

- Modify: `src/components/auth/privy-login-button.tsx`
- Modify: `src/components/auth/invitation-activation-form.tsx`

- [ ] Replace the fixed-height login wrapper with a 40 px primary entry action that opens Privy for passwordless email or Google.
- [ ] Render loading, authenticated-session synchronisation, configuration, and session-exchange failure as compact accessible inline states; retain dashboard redirect after a successful session POST.
- [ ] Align activation labels, inputs, alerts, and submit action to the same compact form rhythm.

### Task 3: Verification

**Files:**

- Test: `src/app/(auth)/masuk/page.tsx`
- Test: `src/app/(auth)/aktivasi/page.tsx`

- [ ] Run `npm run lint` and `npm run build`.
- [ ] Start the local app and inspect `/masuk` and `/aktivasi` at 1440 px and mobile width; confirm the form column stays compact and no authenticated state creates an empty card.
