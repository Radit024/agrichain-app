import type { NextConfig } from "next";

/**
 * Security headers (Fase K, PRD): CSP, HSTS, X-Frame-Options DENY,
 * Referrer-Policy,Permissions-Policy. CSP memperbolehkan frame Privy
 * (auth modal) dan kamera (html5-qrcode) untuk fungsi inti.
 */
const csp = [
  "default-src 'self'",
  // Next.js inline bootstrap + Privy widget
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://auth.privy.io https://api.privy.io wss://relay.privy.io",
  "frame-src https://auth.privy.io https://*.privy.io",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // PGlite (WASM fs access) tidak boleh di-bundle — import.meta.url pecah
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(), microphone=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
