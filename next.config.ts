import type { NextConfig } from "next";

/**
 * Security headers (Fase K, PRD): CSP, HSTS, X-Frame-Options DENY,
 * Referrer-Policy,Permissions-Policy. CSP memperbolehkan frame Privy
 * (auth modal) dan kamera (html5-qrcode) untuk fungsi inti.
 */
const csp = [
  "default-src 'self'",
  // Next.js inline bootstrap + Privy widget + Cloudflare Turnstile bot verification + Google Auth
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io https://challenges.cloudflare.com https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "img-src 'self' data: blob: https://challenges.cloudflare.com https://*.privy.io https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://auth.privy.io https://*.privy.io https://api.privy.io wss://relay.privy.io https://*.rpc.privy.systems https://challenges.cloudflare.com https://accounts.google.com",
  "frame-src https://auth.privy.io https://*.privy.io https://challenges.cloudflare.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // PGlite (WASM fs access) tidak boleh di-bundle — import.meta.url pecah
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "motion"],
  },
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
