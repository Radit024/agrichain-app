import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "test-results/producer-simulation");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test("Simulasi Pengguna Nyata: Produsen Industri Pangan (Budi Pratama)", async ({ page }) => {
  const observations: string[] = [];

  // LANGKAH 1: Masuk ke aplikasi sebagai Produsen (Budi Pratama - PT Agrichain Prima Agro)
  await page.request.post("/api/auth/demo-login", { data: { role: "PRODUCER_ADMIN" } });
  await page.goto("/mainapp/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // LANGKAH 2: Dasbor Produsen
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "01-producer-dashboard.png"),
    fullPage: true,
  });

  const dashboardH2 = await page.locator("h2").allInnerTexts();
  observations.push(`Dashboard Sections: ${dashboardH2.join(", ")}`);

  // LANGKAH 3: Buka Halaman Manajemen Batch untuk mendaftarkan produk baru
  await page.goto("/mainapp/batch", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "02-batch-list-producer.png"),
    fullPage: true,
  });

  // Cek tombol Daftarkan Batch
  const registerBatchBtn = page.getByRole("button", { name: /Daftarkan Batch/i });
  const canRegister = await registerBatchBtn.isVisible();
  observations.push(`Tombol Daftarkan Batch terlihat? ${canRegister}`);

  if (canRegister) {
    await registerBatchBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-dialog-daftarkan-batch.png"),
    });

    const modalLabels = await page.locator("[role='dialog'] label").allInnerTexts();
    observations.push(`Form Pendaftaran Batch Labels: ${modalLabels.join(", ")}`);

    // Tutup dialog
    const batalBtn = page.getByRole("button", { name: /Batal/i });
    if (await batalBtn.isVisible()) {
      await batalBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // LANGKAH 4: Periksa Halaman Detail Batch dari sudut pandang produsen (misal batch 0001)
  const firstBatchLink = page.locator("tbody tr a").first();
  if (await firstBatchLink.isVisible()) {
    await firstBatchLink.click();
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-producer-batch-detail.png"),
      fullPage: true,
    });

    // Cek tab Audit on-chain
    const auditTab = page.getByRole("tab", { name: /Audit/i });
    if (await auditTab.isVisible()) {
      await auditTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "05-producer-batch-audit-tab.png"),
      });
    }

    // Cek tab Kondisi
    const kondisiTab = page.getByRole("tab", { name: /Kondisi/i });
    if (await kondisiTab.isVisible()) {
      await kondisiTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "06-producer-batch-kondisi-tab.png"),
        fullPage: true,
      });
    }
  }

  // LANGKAH 5: Produsen ingin mengirimkan batch ke Distributor via Serah-Terima
  await page.goto("/mainapp/serah-terima", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const catatHandoffBtn = page.getByRole("button", { name: /Catat serah-terima/i });
  if (await catatHandoffBtn.isVisible()) {
    await catatHandoffBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-producer-catat-handoff.png"),
    });

    const batalHandoff = page.getByRole("button", { name: /Batal/i });
    if (await batalHandoff.isVisible()) {
      await batalHandoff.click();
    }
  }

  // LANGKAH 6: Produsen memeriksa Titik Distribusi / Pabrik & Kode Akses
  await page.goto("/mainapp/titik-distribusi", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "08-producer-titik-distribusi.png"),
    fullPage: true,
  });

  // LANGKAH 7: Produsen memeriksa Laporan Kepatuhan & Ekspor
  await page.goto("/mainapp/laporan", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "09-producer-laporan.png"),
    fullPage: true,
  });

  console.log("=== PRODUCER SIMULATION OBSERVATIONS ===");
  console.log(JSON.stringify(observations, null, 2));
});
