# Completing Phases A-F Design

## Scope

This change completes the missing deliverables identified in phases A through F without deploying to Polygon Amoy. Runtime secrets, the Amoy contract address, and database credentials remain environment-only inputs supplied later by the project owner.

## Runtime data access

The application keeps PGlite for deterministic local tests and uses a direct, server-only PostgreSQL connection when `DATABASE_URL` is configured. The existing generic Supabase RPC path is removed because no `exec_sql` RPC exists in the migrations. All production parameterised queries use the PostgreSQL client rather than interpolated SQL. Supabase service-role client remains available for Supabase-specific SDK work, but is not used as a raw-SQL transport.

`supabase/config.toml`, an updated Docker configuration, and `.env.example` document local and hosted setup. The local reset gate is represented by applying the two migrations through the existing PGlite harness; a real Supabase CLI reset remains a documented manual environment check.

## Internal authentication and invitation lifecycle

When Privy authenticates in the browser, the client obtains its access token and POSTs it to a session route. The route verifies it, confirms that the local user is active and has a membership, then stores the token in a Secure, HttpOnly, SameSite=Lax cookie. It never returns the token. The internal layout reads this cookie, runs the same session verification, and redirects unauthenticated or unauthorised users to `/masuk`.

Invitation endpoints are server-side secure primitives. Creation requires an administrator membership in the specified organisation; revocation requires the same authority; activation verifies a Privy token before accepting the invitation. The activation page becomes a client form that sends an invitation token plus its authenticated identity and embedded wallet address only to the activation endpoint. Raw invitation tokens are returned only once to the authorised creating administrator, never logged or stored unhashed.

## Chain write lifecycle

Off-chain actions create idempotent, `PENDING` transaction references and return only the contract call metadata required by a later internal UI. A client-side chain helper signs those calls through the authenticated user's embedded wallet. It submits the resulting transaction hash to a protected server route. That route validates the reference belongs to the caller's organisation, fetches the receipt from the configured Amoy RPC, checks the receipt's contract address and expected ledger event, then attaches the hash to the reference.

The reconciliation worker reruns receipt checks for pending references. A confirmed receipt updates the reference and associated business record to `CONFIRMED`; a reverted receipt or stale reference becomes `FAILED`. No evaluator private key is used for user-owned register or handoff transactions. This preserves the plan's two-party embedded-wallet custody model. The worker is invoked with a server secret, is idempotent, and can be scheduled by the deployment platform.

## Error handling and security

Routes use neutral responses for authentication and transaction-validation failures. Server routes authenticate from the bearer header only when issuing a session cookie; subsequent server access relies on the HttpOnly cookie. All invitation, transaction, and reconciliation input is validated. Receipt validation rejects a transaction directed at another contract or missing the expected event. No raw access code, Privy token, invitation token, private key, or secret is written to audit metadata.

## Verification

Tests cover cookie-session issuance/rejection, layout session primitives, administrator-only invitation create/revoke, activation, runtime adapter selection, chain receipt validation, and reconciliation results. Existing Vitest, Hardhat, ESLint, and production build gates must pass. Amoy deployment is not run; the deploy script and environment documentation are verified statically.
