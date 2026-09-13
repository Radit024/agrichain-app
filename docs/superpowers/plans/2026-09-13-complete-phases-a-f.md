# Completing Phases A-F Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the outstanding Phase A-F runtime, authentication, invitation, and chain-write foundations without executing an Amoy deployment.

**Architecture:** A server-only direct PostgreSQL adapter handles hosted database access while PGlite stays the deterministic local test adapter. Privy access tokens are verified once to establish an HttpOnly app session, which is required by protected layouts and mutation routes. User-owned ledger calls are created as off-chain intents, signed by the embedded wallet, and confirmed only after a receipt/event verifier accepts the transaction.

**Tech Stack:** Next.js 16 App Router route handlers and layouts, TypeScript, Zod, Vitest/PGlite, PostgreSQL `postgres` client, ethers v6, Privy React/Node SDK, Solidity/Hardhat.

---

## File structure

- `src/server/db/adapter.ts` selects PGlite or a parameterised hosted PostgreSQL adapter.
- `src/server/auth/directory.ts` is the sole database-backed `UserDirectory` implementation.
- `src/server/auth/app-session.ts` creates and reads the encrypted/signed HttpOnly session token boundary.
- `src/app/api/auth/session/route.ts` establishes/deletes the cookie after Privy verification.
- `src/app/api/invitations/*/route.ts` authenticates create, revoke, and activation requests.
- `src/server/chain/ledger.ts` owns the contract ABI, provider, receipt inspection, and encoded user calls.
- `src/app/api/chain/submit/route.ts` attaches a verified user transaction hash to its idempotent reference.
- `src/workers/reconcile/index.ts` runs pending-reference reconciliation from a server job.

### Task 1: Close Phase A/B runtime configuration

**Files:**

- Create: `supabase/config.toml`
- Create: `src/components/ui/form.tsx`
- Modify: `.env.example`
- Modify: `package.json`, `package-lock.json`
- Modify: `src/server/db/adapter.ts`
- Test: `tests/integration/db-adapter.test.ts`

- [ ] **Step 1: Write adapter-selection tests.** Mock `postgres` and assert `DATABASE_URL` selects the production adapter; clear it and assert PGlite receives `PGLITE_PATH`. The hosted assertion must issue `select $1::text as value` with `['safe']` and prove the value reaches the tagged-template parameter array rather than SQL interpolation.

- [ ] **Step 2: Run the focused test and verify it fails.**

Run: `npx vitest run tests/integration/db-adapter.test.ts`

Expected: FAIL because the current adapter calls undefined Supabase RPC `exec_sql`.

- [ ] **Step 3: Install and use the direct PostgreSQL driver.**

Run: `npm install postgres`

Replace the `SUPABASE_SERVICE_ROLE_KEY` branch in `adapter.ts` with a cached `postgres(process.env.DATABASE_URL, { prepare: false })` client and a small query compiler that turns only `$1..$n` placeholders into a tagged `sql.unsafe(compiledText, params)` call. Reject missing `DATABASE_URL`; do not create a generic RPC or place database credentials in the browser. Keep existing PGlite behaviour unchanged.

- [ ] **Step 4: Add local configuration and documentation inputs.** Add `DATABASE_URL=postgresql://...` as server-only to `.env.example`; create Supabase CLI project config with local API/DB ports consistent with `docker-compose.yml`; add the missing shadcn form helper generated from the installed form primitives. Do not add secret values.

- [ ] **Step 5: Re-run focused and full database tests.**

Run: `npx vitest run tests/integration/db-adapter.test.ts tests/unit/rls.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit.**

Run: `git add supabase/config.toml .env.example package.json package-lock.json src/server/db/adapter.ts src/components/ui/form.tsx tests/integration/db-adapter.test.ts && git commit -m "feat: add hosted database adapter"`

### Task 2: Establish internal server sessions and guard routes

**Files:**

- Create: `src/server/auth/directory.ts`
- Create: `src/server/auth/app-session.ts`
- Create: `src/app/api/auth/session/route.ts`
- Modify: `src/components/auth/privy-login-button.tsx`
- Modify: `src/app/(internal)/layout.tsx`
- Test: `tests/integration/app-session.test.ts`

- [ ] **Step 1: Write failing session tests.** Cover: valid bearer token plus ACTIVE member issues only a `HttpOnly; SameSite=Lax; Path=/` cookie; unknown/revoked user produces 401 without `Set-Cookie`; cookie session resolves to the user; malformed cookie and expired Privy token resolve to no session.

- [ ] **Step 2: Run focused test and verify it fails.**

Run: `npx vitest run tests/integration/app-session.test.ts`

Expected: FAIL because no app session module or route exists.

- [ ] **Step 3: Implement reusable secure primitives.** `directory.ts` implements `findUserByDid` and `findMemberships` with `getDbAdapter`. `app-session.ts` uses a random `APP_SESSION_SECRET` HMAC-SHA256 envelope containing the Privy access token and a short expiry; `readAppSession` verifies the MAC before calling `requireSession`. `POST /api/auth/session` reads only `Authorization: Bearer`, verifies via `requireSession`, then sets the cookie; `DELETE` removes it. Never accept a token as a Server Action argument.

- [ ] **Step 4: Wire browser login and server layout.** On Privy authentication, `PrivyLoginButton` calls `getAccessToken`, posts it to the session route, and only then redirects. The async internal layout reads `cookies()`, calls `readAppSession`, and `redirect('/masuk')` when absent. It must not rely on the client guard or render an unauthorised dashboard first.

- [ ] **Step 5: Run focused and existing auth tests.**

Run: `npx vitest run tests/integration/app-session.test.ts tests/integration/auth.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit.**

Run: `git add src/server/auth src/app/api/auth src/components/auth/privy-login-button.tsx "src/app/(internal)/layout.tsx" tests/integration/app-session.test.ts .env.example && git commit -m "feat: guard internal routes with Privy session"`

### Task 3: Complete protected invitation lifecycle

**Files:**

- Create: `src/app/api/invitations/route.ts`
- Create: `src/app/api/invitations/activate/route.ts`
- Create: `src/app/api/invitations/[invitationId]/route.ts`
- Create: `src/components/auth/invitation-activation-form.tsx`
- Modify: `src/server/actions/invitations.ts`
- Modify: `src/app/(auth)/aktivasi/page.tsx`
- Test: `tests/integration/invitation-routes.test.ts`

- [ ] **Step 1: Write failing protected-lifecycle tests.** Test that only `PRODUCER_ADMIN`, `DISTRIBUTOR_ADMIN`, or `RETAILER_ADMIN` in the target org can create an invitation; a cross-org user receives 403; the creator may revoke an unused invitation; revoked tokens return the same neutral activation error as invalid ones; activation uses the DID verified from its bearer token, not a DID supplied in JSON.

- [ ] **Step 2: Run the focused test and verify it fails.**

Run: `npx vitest run tests/integration/invitation-routes.test.ts`

Expected: FAIL because the three routes and revoke action do not exist.

- [ ] **Step 3: Add server-authorised invitation operations.** Add `revokeInvitation(invitationId, db, session)` that updates only an unaccepted invitation in an organisation where the session has an admin role. Add wrappers that derive `createdByUserId` and activation DID from `requireSession`. Do not expose raw tokens in GET responses or audit metadata; only the successful create POST includes it once.

- [ ] **Step 4: Implement the activation form.** Read `token` from the activation URL only into controlled client state, obtain Privy access token and embedded wallet address, POST to activation endpoint, then establish the app cookie and redirect to `/dashboard`. Display a neutral invalid/expired message. The form must never print the invitation token to console or URL after submit.

- [ ] **Step 5: Run invitation tests.**

Run: `npx vitest run tests/integration/invitations.test.ts tests/integration/invitation-routes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit.**

Run: `git add src/server/actions/invitations.ts src/app/api/invitations src/components/auth/invitation-activation-form.tsx "src/app/(auth)/aktivasi/page.tsx" tests/integration/invitation-routes.test.ts && git commit -m "feat: complete invitation activation and revocation"`

### Task 4: Add verified embedded-wallet ledger submission

**Files:**

- Create: `src/server/chain/ledger.ts`
- Create: `src/lib/chain-client.ts`
- Create: `src/app/api/chain/submit/route.ts`
- Modify: `src/server/actions/batches.ts`
- Modify: `src/server/actions/handoffs.ts`
- Modify: `src/server/actions/access.ts`
- Modify: `src/server/chain/reconcile.ts`
- Modify: `contracts/deploy/amoy-deploy.ts`
- Test: `tests/integration/chain-submission.test.ts`

- [ ] **Step 1: Write failing receipt-verification tests.** Use a fake ethers provider to prove: a receipt sent to a different contract is rejected, a successful receipt without the expected event is rejected, a matching `BatchRegistered`/handoff/`ValidAccessRecorded` event is accepted, and a reference from another organisation cannot receive a transaction hash.

- [ ] **Step 2: Run focused test and verify it fails.**

Run: `npx vitest run tests/integration/chain-submission.test.ts`

Expected: FAIL because no ledger verifier or submission route exists.

- [ ] **Step 3: Implement ledger metadata and client call preparation.** `ledger.ts` exports a minimal ABI, `JsonRpcProvider`, contract-address validation, receipt log decoder, and `verifyLedgerReceipt(reference, receipt)`. The action result types gain `{ transactionReferenceId, chainCall }`, where `chainCall` contains only target address, ABI method, and already-hashed arguments. `chain-client.ts` receives an EIP-1193 embedded wallet provider, submits the encoded call, and POSTs `{ transactionReferenceId, txHash }` to the protected route.

- [ ] **Step 4: Securely attach and reconcile transactions.** The submit route resolves the app session, verifies reference ownership and event type, verifies receipt when already mined, then atomically stores the unique hash. `reconcile.ts` uses the same verifier for pending hashes and updates related `batches`, `handoff_intents`, and `anchor_digests` sync status with the reference. A failed/reverted receipt never marks a business mutation confirmed.

- [ ] **Step 5: Make deployment output and environment explicit.** The deploy script writes address/ABI only after a successful deploy and documents the role grants needed by user embedded wallets. It must not grant user-owned roles to `EVALUATOR_PRIVATE_KEY` or claim that a local script deployed to Amoy.

- [ ] **Step 6: Run focused and existing action tests.**

Run: `npx vitest run tests/integration/chain-submission.test.ts tests/integration/actions.test.ts && npx hardhat test`

Expected: PASS.

- [ ] **Step 7: Commit.**

Run: `git add src/server/chain src/lib/chain-client.ts src/app/api/chain src/server/actions contracts/deploy/amoy-deploy.ts tests/integration/chain-submission.test.ts .env.example && git commit -m "feat: verify embedded-wallet ledger submissions"`

### Task 5: Run reconciliation worker and close gates

**Files:**

- Create: `src/workers/reconcile/index.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `../IMPLEMENTATION-PLAN.md`
- Test: `tests/integration/reconcile-worker.test.ts`

- [ ] **Step 1: Write failing worker tests.** Mock the provider and adapter, then assert one worker run reconciles pending hashes, rejects an absent `RECONCILE_API_KEY`, and does not overlap a still-running execution.

- [ ] **Step 2: Run focused test and verify it fails.**

Run: `npx vitest run tests/integration/reconcile-worker.test.ts`

Expected: FAIL because no worker entry point exists.

- [ ] **Step 3: Implement an idempotent server job.** Add `npm run reconcile`, load `RECONCILE_API_KEY` and RPC settings, acquire an in-process no-overlap guard, invoke `reconcileChainWrites(getDbAdapter(), getLedgerReader())`, log only aggregate counts, and exit non-zero for configuration or provider errors. Document a scheduler invocation; do not start cron inside Next request lifecycle.

- [ ] **Step 4: Update verification records.** In README document `DATABASE_URL`, `APP_SESSION_SECRET`, `RECONCILE_API_KEY`, local Supabase setup, and the exact no-deploy status. In the master plan mark only the implemented code/test tasks A-F as complete; retain unchecked manual gates for a real Privy login, Supabase CLI reset, and Amoy deployment.

- [ ] **Step 5: Run the full project gate.**

Run: `npm run lint && npm run build && npx vitest run && npx hardhat test`

Expected: zero lint errors, successful production build, all Vitest and Hardhat tests passing.

- [ ] **Step 6: Commit.**

Run: `git add src/workers/reconcile package.json package-lock.json README.md ../IMPLEMENTATION-PLAN.md tests/integration/reconcile-worker.test.ts .env.example && git commit -m "feat: add reconciliation worker and phase gates"`

## Self-review

This plan covers each design requirement: hosted database access (Task 1), secure server sessions (Task 2), invitation activation/revocation (Task 3), embedded-wallet receipt validation (Task 4), and scheduled reconciliation plus documented/manual gates (Task 5). Manual Privy, Supabase CLI, and Amoy operations remain intentionally unexecuted because they need owner-provided credentials and are not represented as implemented work.
