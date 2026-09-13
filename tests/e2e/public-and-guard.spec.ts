import { expect, test } from "@playwright/test";

/**
 * E2E publik (Fase L, K11): halaman QR publik + guard redirect + 404 aman.
 * Basis data: PGlite seed lokal (public_id tetap).
 */

const VALID_PUBLIC_ID = "AG23-7QXB-KF4M-9R2T";

test.describe("Halaman publik QR", () => {
  test("batch valid menampilkan data tersanitasi + batasan informasi", async ({ page }) => {
    const response = await page.goto(`/p/${VALID_PUBLIC_ID}`);
    expect(response?.status()).toBe(200);

    await expect(page.getByText("Detail batch")).toBeVisible();
    // Tidak menampilkan lokasi presisi / identitas petugas / kontrol organisasi
    await expect(page.getByText("Batasan informasi")).toBeVisible();
    await expect(page.getByText(/SIMULATOR/).first()).toBeVisible();
  });

  test("public_id tidak dikenal → 404 netral", async ({ page }) => {
    const response = await page.goto("/p/ZZZZ-ZZZZ-ZZZZ-ZZZZ");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Batch tidak tersedia untuk ditampilkan.")).toBeVisible();
  });

  test("public_id format salah → 404 netral (tidak dibedakan)", async ({ page }) => {
    const response = await page.goto("/p/helloworld");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Batch tidak tersedia untuk ditampilkan.")).toBeVisible();
  });
});

test.describe("Guard internal", () => {
  test("tanpa sesi → /dashboard redirect ke /masuk", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/masuk$/);
  });

  test("/batch tanpa sesi → redirect /masuk", async ({ page }) => {
    await page.goto("/batch");
    await expect(page).toHaveURL(/\/masuk$/);
  });

  test("/ redirect ke /masuk", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/masuk$/);
  });
});

test.describe("Halaman masuk", () => {
  test("menampilkan konteks invite-only dan kontrol login", async ({ page }) => {
    await page.goto("/masuk");
    await expect(
      page.getByText("Akses internal hanya untuk petugas yang menerima undangan."),
    ).toBeVisible();
    // Kontrol Privy (app id terkonfigurasi) ATAU fallback konfigurasi (tanpa env)
    const privyControl = page.getByRole("button", {
      name: /Lanjutkan dengan|Menyiapkan login/,
    });
    const fallbackNotice = page.getByText(/Konfigurasi login|Masuk dengan/);
    const either = privyControl.or(fallbackNotice);
    await expect(either.first()).toBeVisible();
  });
});

test.describe("API publik", () => {
  test("GET /api/public/batch valid → data tersanitasi", async ({ request }) => {
    const res = await request.get(`/api/public/batch/${VALID_PUBLIC_ID}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.publicId).toBe(VALID_PUBLIC_ID);
    // Hanya field tersanitasi
    expect(Object.keys(data).sort()).toEqual(
      [
        "categoryName",
        "conditionStatus",
        "createdAt",
        "custodyStage",
        "dataQualityStatus",
        "distributionStatus",
        "paused",
        "publicId",
        "source",
        "timeline",
      ].sort(),
    );
  });

  test("GET /api/public/batch tidak dikenal → 404 netral", async ({ request }) => {
    const res = await request.get("/api/public/batch/ZZZZ-ZZZZ-ZZZZ-ZZZZ");
    expect(res.status()).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Batch tidak tersedia untuk ditampilkan.");
    expect(Object.keys(data)).toEqual(["error"]);
  });
});

test.describe("Security headers (Fase K)", () => {
  test("header keamanan aktif di halaman publik", async ({ request }) => {
    const res = await request.get(`/p/${VALID_PUBLIC_ID}`);
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["permissions-policy"]).toContain("camera=(self)");
  });
});
