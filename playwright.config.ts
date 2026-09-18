import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (Fase L, K11): alur publik + guard redirect + validasi form.
 * Mutasi internal diuji via integration test (mock Privy) — bukan di sini.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm.cmd run start",
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: true,
        env: {
          // E2E jalan terhadap build produksi dengan seed PGlite lokal
          NODE_ENV: "production",
          PLAYWRIGHT_TEST: "true",
        },
      },
});
