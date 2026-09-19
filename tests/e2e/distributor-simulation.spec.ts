import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "test-results/distributor-simulation");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test("Simulasi Pengguna Nyata: Distributor Logistik (Siti Rahma)", async ({ page }) => {
  const observations: string[] = [];

  // LANGKAH 1: Masuk ke aplikasi dan pilih peran Distributor
  await page.request.post("/api/auth/demo-login", { data: { role: "DISTRIBUTOR_ADMIN" } });
  await page.goto("/mainapp/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "01-login-distributor-selected.png"),
  });

  // LANGKAH 2: Analisis Halaman Dashboard sebagai Distributor
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "02-dashboard-distributor.png"),
    fullPage: true,
  });

  const topbarUser = await page.locator("header").innerText();
  observations.push(`Topbar Info: ${topbarUser.replace(/\n+/g, " | ")}`);

  // LANGKAH 3: Buka Halaman Serah-Terima untuk memeriksa barang masuk & keluar
  await page.goto("/mainapp/serah-terima", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "03-serah-terima-page.png"),
    fullPage: true,
  });

  // Cek apakah ada tombol aksi langsung di baris tabel (misal tombol Terima Barang / Konfirmasi)
  const tableRows = page.locator("tbody tr");
  const rowCount = await tableRows.count();
  const tableButtons = await page.locator("tbody tr button").all();
  observations.push(
    `Jumlah baris serah terima: ${rowCount}, Jumlah tombol aksi di dalam tabel: ${tableButtons.length}`,
  );

  // LANGKAH 4: Coba klik "Catat serah-terima" untuk kirim barang ke Retailer
  const catatBtn = page.getByRole("button", { name: /Catat serah-terima/i });
  const canClickCatat = (await catatBtn.isVisible()) && !(await catatBtn.isDisabled());
  observations.push(`Tombol Catat Serah-terima aktif? ${canClickCatat}`);

  if (canClickCatat) {
    await catatBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-dialog-catat-serah-terima.png"),
    });

    const formLabels = await page.locator("[role='dialog'] label").allInnerTexts();
    observations.push(`Input formulir serah terima: ${formLabels.join(", ")}`);

    // Tutup dialog
    const batalBtn = page.getByRole("button", { name: /Batal/i });
    if (await batalBtn.isVisible()) {
      await batalBtn.click();
    }
  }

  // LANGKAH 5: Periksa Halaman Detail Batch yang sedang dalam perjalanan
  const firstBatchLink = page.locator("tbody tr a").first();
  if (await firstBatchLink.isVisible()) {
    await firstBatchLink.click();
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-batch-detail-view.png"),
      fullPage: true,
    });
  }

  // LANGKAH 6: Buka Halaman Verifikasi Akses
  await page.goto("/mainapp/verifikasi", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "06-verifikasi-page.png"),
    fullPage: true,
  });

  console.log("=== SIMULATION OBSERVATIONS ===");
  console.log(JSON.stringify(observations, null, 2));
});
