import { expect, test } from "@playwright/test";
import { createTestSessionCookie } from "../helpers/auth";

const VALID_PUBLIC_ID = "AG23-7QXB-KF4M-9R2T";
const VALID_BATCH_ID = "88888888-8888-8888-8888-888888888881";

// Slop texts that should NEVER appear in the production application
const SLOP_PATTERNS = [
  /\[object Object\]/,
  /\bundefined\b/,
  /\bNaN\b/,
  /Lorem ipsum/i,
  /Buying Price/i,
  /Quantity in stock/i,
  /Singanallur/i,
  /Coimbatore/i,
  /Horlicks/i,
  /Maggi/i,
];

test.describe("Anti-UI-Slop: Halaman Publik", () => {
  test("Halaman /masuk — bebas dari form login palsu & teks generic", async ({ page }) => {
    await page.goto("/masuk");
    await expect(page).toHaveTitle(/Masuk Petugas/);

    // Harus menampilkan konteks invite-only
    await expect(
      page.getByText("Akses internal hanya untuk petugas yang menerima undangan."),
    ).toBeVisible();

    // Tidak boleh ada password input palsu atau boilerplate signup
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText("Remember for 30 days")).toHaveCount(0);
    await expect(page.getByText("Forgot password")).toHaveCount(0);
    await expect(page.getByText(/Don't have an account/i)).toHaveCount(0);

    // Harus ada kontrol Privy login resmi
    await expect(page.getByRole("button", { name: /Lanjutkan dengan Google/i })).toBeVisible();

    // Tidak boleh ada teks slop
    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("Halaman /aktivasi — layout bersih & formulir jelas", async ({ page }) => {
    await page.goto("/aktivasi");
    await expect(page).toHaveTitle(/Aktivasi Undangan/);

    // Bebas slop
    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("Halaman Publik QR /p/[publicId] — data tersanitasi & label kepatuhan jelas", async ({
    page,
  }) => {
    await page.goto(`/p/${VALID_PUBLIC_ID}`);
    expect(await page.title()).toBeTruthy();

    // Menampilkan identitas batch
    await expect(page.getByText("Detail batch")).toBeVisible();
    await expect(page.getByText(VALID_PUBLIC_ID)).toBeVisible();

    // Wajib ada label batasan informasi & SIMULATOR
    await expect(page.getByText(/Batasan informasi/i)).toBeVisible();
    await expect(page.getByText(/SIMULATOR/).first()).toBeVisible();

    // Tidak ada PPM mentah (angka jutaan tanpa koma di data sensor)
    const bodyText = await page.innerText("body");
    expect(bodyText).not.toMatch(/\b\d{7,}\s*(?:°C|%|PPM)\b/);

    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("Halaman 404 — responsif & netral", async ({ page }) => {
    const res = await page.goto("/p/NON-EXISTENT-ID");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Batch tidak tersedia untuk ditampilkan.")).toBeVisible();
  });
});

test.describe("Anti-UI-Slop: Halaman Internal Terautentikasi", () => {
  test.beforeEach(async ({ context }) => {
    const sessionToken = await createTestSessionCookie();
    await context.addCookies([
      {
        name: "agrilink_session",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  });

  test("/mainapp/dashboard — metrik operasional rantai pasok pangan", async ({ page }) => {
    await page.goto("/mainapp/dashboard");
    await expect(page).toHaveTitle(/Dashboard/);

    // Verifikasi metrik domain
    await expect(page.getByText(/Distribusi & Kustodi/i)).toBeVisible();
    await expect(page.getByText(/Kepatuhan Kondisi/i)).toBeVisible();
    await expect(page.getByText(/Verifikasi Akses Petugas/i)).toBeVisible();

    // Verifikasi tidak ada label e-commerce slop
    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("/mainapp/batch — tabel batch ketertelusuran", async ({ page }) => {
    await page.goto("/mainapp/batch");
    await expect(page).toHaveTitle(/Manajemen Batch/);

    // Summary cards domain
    await expect(page.getByText("Ringkasan Batch")).toBeVisible();
    await expect(page.getByText("Total Batch")).toBeVisible();
    await expect(page.getByText("Compliant").first()).toBeVisible();
    await expect(page.getByText("Dalam Distribusi").first()).toBeVisible();

    // Header tabel
    await expect(page.getByText("Kode Batch")).toBeVisible();
    if ((page.viewportSize()?.width ?? 1024) >= 640) {
      await expect(page.getByText("Kategori / Mode")).toBeVisible();
    }
    await expect(page.getByText("Status Distribusi")).toBeVisible();

    // Bebas slop
    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("/mainapp/batch/[batchId] — detail batch, grafik sensor telemetri & evaluasi", async ({
    page,
  }) => {
    await page.goto(`/mainapp/batch/${VALID_BATCH_ID}`);
    await expect(page).toHaveTitle(/Detail Batch/);

    // Tabs
    await expect(page.getByRole("tab", { name: /Ringkasan/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Kondisi/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Serah-terima/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Audit/i })).toBeVisible();

    // Klik tab Kondisi
    await page.getByRole("tab", { name: /Kondisi/i }).click();

    // Verifikasi komponen kondisi: profil kepatuhan, tren telemetri, tabel riwayat
    await expect(page.getByText("Tren Telemetri Sensor")).toBeVisible();
    await expect(page.getByText("Riwayat Evaluasi Kondisi")).toBeVisible();
    await expect(page.getByText("Riwayat Pembacaan Telemetri Sensor")).toBeVisible();

    // Pastikan tidak ada raw PPM
    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("/mainapp/serah-terima — alur kustodi dan status transfer", async ({ page }) => {
    await page.goto("/mainapp/serah-terima");
    await expect(page).toHaveTitle(/Serah-terima/);

    await expect(page.getByText("Ringkasan Serah-terima")).toBeVisible();
    await expect(page.getByText("Total Intent")).toBeVisible();
    await expect(page.getByText("Daftar Serah-terima")).toBeVisible();

    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("/mainapp/titik-distribusi — manajemen titik fisik & jadwal operasional", async ({
    page,
  }) => {
    await page.goto("/mainapp/titik-distribusi");
    await expect(page).toHaveTitle(/Titik Distribusi/);

    await expect(page.getByText("Ringkasan Titik Distribusi")).toBeVisible();
    await expect(page.getByText("Daftar Titik Distribusi")).toBeVisible();
    await expect(page.getByText("Titik Aktif")).toBeVisible();

    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("/mainapp/laporan — analitik kepatuhan dan audit trail", async ({ page }) => {
    await page.goto("/mainapp/laporan");
    await expect(page).toHaveTitle(/Laporan/);

    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("/mainapp/pengaturan — fasilitas pangan Indonesia & kontrol darurat", async ({ page }) => {
    await page.goto("/mainapp/pengaturan");
    await expect(page).toHaveTitle(/Pengaturan/);

    // Harus menampilkan fasilitas pangan Indonesia
    await expect(page.getByText(/Gudang Penyangga Karawang/i)).toBeVisible();
    await expect(page.getByText(/Depo Transit Cikarang/i)).toBeVisible();

    // Tidak boleh ada sisa toko India
    await expect(page.getByText(/Coimbatore/i)).toHaveCount(0);
    await expect(page.getByText(/Singanallur/i)).toHaveCount(0);

    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });

  test("/mainapp/verifikasi — pemindai QR dan fallback kode manual", async ({ page }) => {
    await page.goto("/mainapp/verifikasi");
    await expect(page).toHaveTitle(/Verifikasi/);

    const bodyText = await page.innerText("body");
    for (const pattern of SLOP_PATTERNS) {
      expect(bodyText).not.toMatch(pattern);
    }
  });
});
