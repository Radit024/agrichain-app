# Privy login on the sign-in page

## Goal

Replace the static Privy placeholder on `/masuk` with a working control that opens the Privy authentication flow.

## Design

- Keep `src/app/(auth)/masuk/page.tsx` as a Server Component so its metadata and static layout remain server-rendered.
- Add a narrowly scoped Client Component for the login panel. It consumes `usePrivy()` beneath the existing `AppPrivyProvider`.
- While the Privy SDK is initializing, show a disabled loading control. Once ready, show a button that invokes `login()`.
- If `NEXT_PUBLIC_PRIVY_APP_ID` is unavailable, show a configuration message instead of presenting a non-working button.

## Boundaries

- `NEXT_PUBLIC_PRIVY_APP_ID` is only exposed to the browser as required by the Privy React provider.
- `PRIVY_APP_ID` and `PRIVY_VERIFICATION_KEY` remain server-only and are not imported by the client component.
- Post-login authorization, invitation validation, and redirect behavior are outside this change; existing server-side guards remain authoritative.

## Validation

- Run lint and the existing test suite.
- Run a production build to verify the client/server boundary and environment-variable references compile.
