import { test, expect } from "@playwright/test";
import { createTestSessionCookie } from "../helpers/auth";
import fs from "node:fs";
import path from "node:path";

const VALID_PUBLIC_ID = "AG23-7QXB-KF4M-9R2T";
const VALID_BATCH_ID = "88888888-8888-8888-8888-888888888881";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "test-results/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

const pagesToTest = [
  { name: "01-masuk", url: "/masuk", auth: false },
  { name: "02-public-batch", url: `/p/${VALID_PUBLIC_ID}`, auth: false },
  { name: "03-dashboard", url: "/mainapp/dashboard", auth: true },
  { name: "04-batch", url: "/mainapp/batch", auth: true },
  { name: "05-batch-detail", url: `/mainapp/batch/${VALID_BATCH_ID}`, auth: true },
  { name: "06-serah-terima", url: "/mainapp/serah-terima", auth: true },
  { name: "07-titik-distribusi", url: "/mainapp/titik-distribusi", auth: true },
  { name: "08-laporan", url: "/mainapp/laporan", auth: true },
  { name: "09-pengaturan", url: "/mainapp/pengaturan", auth: true },
  { name: "10-verifikasi", url: "/mainapp/verifikasi", auth: true },
];

for (const p of pagesToTest) {
  test(`Visual & Layout Audit: ${p.name} (${p.url})`, async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    if (p.auth) {
      const sessionToken = await createTestSessionCookie();
      await page.context().addCookies([
        {
          name: "agrilink_session",
          value: sessionToken,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }

    await page.goto(p.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    if (p.name === "08-laporan") {
      const styles = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const main = document.querySelector("main");
        const pageTransition = main?.firstElementChild;
        const stagger = pageTransition?.firstElementChild;
        return {
          h1Color: h1 ? window.getComputedStyle(h1).color : null,
          h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
          pageTransitionOpacity: pageTransition
            ? window.getComputedStyle(pageTransition).opacity
            : null,
          staggerOpacity: stagger ? window.getComputedStyle(stagger).opacity : null,
          firstItemOpacity: stagger?.firstElementChild
            ? window.getComputedStyle(stagger.firstElementChild).opacity
            : null,
        };
      });
      console.log(`[${projectName}] 08-laporan styles:`, styles);
    }

    // 1. Check for unexpected horizontal overflow (scrollWidth > innerWidth + 2)
    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientW = window.innerWidth;
      return scrollW > clientW + 2;
    });
    expect(hasHorizontalOverflow, `Horizontal overflow detected on ${p.url}`).toBe(false);

    // 2. Check for AI Slop "rainbow gradient" or garish neon backgrounds
    const hasGarishGradient = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll("div, section, main, card"));
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundImage;
        if (
          bg.includes("linear-gradient") &&
          (bg.includes("rgb(168, 85, 247)") || // purple-500
            bg.includes("rgb(236, 72, 153)") || // pink-500
            bg.includes("rgb(147, 51, 234)") || // purple-600
            bg.includes("rgb(99, 102, 241)")) // indigo-500 neon
        ) {
          return true;
        }
      }
      return false;
    });
    expect(hasGarishGradient, `Garish AI slop gradient found on ${p.url}`).toBe(false);

    // 3. Check card background and text readability
    const unreadableCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".bg-card, .bg-white"));
      const issues: string[] = [];
      for (const card of cards) {
        const style = window.getComputedStyle(card);
        const textColor = style.color;
        if (style.backgroundColor === "rgb(255, 255, 255)" && textColor === "rgb(255, 255, 255)") {
          issues.push("White text on white card detected");
        }
      }
      return issues;
    });
    expect(unreadableCards).toEqual([]);

    // 4. Capture screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${p.name}-${projectName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    testInfo.attach("screenshot", { path: screenshotPath });
  });
}
