# Privy dashboard redirect

## Goal

Send an authenticated Privy user from `/masuk` to `/dashboard` immediately after authentication and whenever an existing authenticated session opens the sign-in route.

## Design

- Keep the redirect state inside `PrivyLoginButton`, the existing Client Component that consumes Privy state.
- When `ready` and `authenticated` are both true, call `router.replace("/dashboard")` in an effect.
- Render a short redirect status while navigation is being scheduled; do not render a second Privy action for authenticated users.
- When the SDK is ready and there is no authenticated session, retain the existing button that invokes `login()`.

## Boundaries

- The redirect does not grant authorization. Server-side authorization remains responsible for protecting internal pages as the dashboard becomes functional.
- The redirect does not alter Privy provider configuration, Google OAuth settings, access-token handling, or logout behavior.

## Validation

- Extend the existing importability regression coverage for the login control.
- Run lint, the complete Vitest suite, and a production build.
