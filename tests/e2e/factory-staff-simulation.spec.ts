import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "test-results/factory-staff-simulation");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test("Simulasi Pengguna Nyata: Petugas Pabrik / QC (Ahmad Fauzi)", async ({ page }) => {
  const observations: string[] = [];

  // LANGKAH 1: Masuk ke aplikasi sebagai Petugas Pabrik
  await page.request.post("/api/auth/demo-login", { data: { role: "FACTORY_STAFF" } });
  await page.goto("/mainapp/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // LANGKAH 2: Dasbor Petugas Pabrik
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "01-factory-dashboard.png"),
    fullPage: true,
  });

  const dashboardCards = await page.locator("h2").allInnerTexts();
  observations.push(`Dashboard Sections: ${dashboardCards.join(", ")}`);

  // LANGKAH 3: Pendaftaran Batch Baru di Line Produksi Pabrik
  await page.goto("/mainapp/batch", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "02-batch-list-factory.png"),
    fullPage: true,
  });

  const registerBtn = page.getByRole("button", { name: /Daftarkan Batch/i });
  if (await registerBtn.isVisible()) {
    await registerBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-dialog-daftarkan-batch.png"),
    });

    const inputs = await page
      .locator("[role='dialog'] input, [role='dialog'] button[role='combobox']")
      .count();
    observations.push(`Jumlah input pendaftaran batch: ${inputs}`);

    // Tutup dialog
    const batalBtn = page.getByRole("button", { name: /Batal/i });
    if (await batalBtn.isVisible()) {
      await batalBtn.click();
    }
  }

  // LANGKAH 4: Periksa Detail Batch & Kesiapan Cetak Label QR
  const firstBatchLink = page.locator("tbody tr a").first();
  if (await firstBatchLink.isVisible()) {
    await firstBatchLink.click();
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-batch-detail-factory.png"),
      fullPage: true,
    });

    // Cek tab Kondisi untuk memeriksa sensor suhu pendingin line produksi
    const kondisiTab = page.getByRole("tab", { name: /Kondisi/i });
    if (await kondisiTab.isVisible()) {
      await kondisiTab.click();
      await page.waitForTimeout(600);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "05-sensor-telemetry-kondisi.png"),
        fullPage: true,
      });
    }
  }

  // LANGKAH 5: Inisiasi Serah-Terima ke Truk Distributor Logistik
  await page.goto("/mainapp/serah-terima", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const catatBtn = page.getByRole("button", { name: /Catat serah-terima/i });
  if ((await catatBtn.isVisible()) && !(await catatBtn.isDisabled())) {
    await catatBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-dialog-catat-serah-terima.png"),
    });

    const formLabels = await page.locator("[role='dialog'] label").allInnerTexts();
    observations.push(`Label form serah terima pabrik: ${formLabels.join(", ")}`);

    const batalBtn = page.getByRole("button", { name: /Batal/i });
    if (await batalBtn.isVisible()) {
      await batalBtn.click();
    }
  }

  // LANGKAH 6: Verifikasi di Dok Muat Pabrik Karawang
  await page.goto("/mainapp/verifikasi", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "07-verifikasi-dok-muat.png"),
    fullPage: true,
  });

  console.log("=== FACTORY STAFF SIMULATION OBSERVATIONS ===");
  console.log(JSON.stringify(observations, null, 2));
});
