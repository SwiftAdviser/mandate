import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SECTIONS = [
  { selector: 'h1',                              label: 'Hero heading' },
  { selector: 'text=Works with',                 label: 'Works with strip' },
  { selector: '#capabilities',                   label: 'Capabilities section' },
  { selector: 'text=What You Can Build',         label: 'What You Can Build' },
  { selector: 'text=Early Access',               label: 'Contact / Early Access' },
  { selector: 'a:has-text("Join Telegram")',     label: 'Telegram CTA button' },
  { selector: 'footer',                          label: 'Footer' },
];

async function scrollToBottom(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => {
      let last = -1;
      const step = () => {
        window.scrollBy(0, 400);
        const cur = window.scrollY;
        if (cur === last) { resolve(); return; }
        last = cur;
        setTimeout(step, 100);
      };
      step();
    });
  });
}

test.describe('Landing – mobile visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('h1', { timeout: 20_000 });
  });

  test('page title is Mandate', async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain('mandate');
  });

  test('hero fits in one viewport (no vertical scroll needed)', async ({ page }) => {
    const viewportHeight = page.viewportSize()!.height;
    const h1 = page.locator('h1');
    const box = await h1.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThan(viewportHeight);
  });

  test('"Works with" logos are visible in hero', async ({ page }) => {
    const strip = page.getByText('Works with');
    await expect(strip).toBeVisible();
    const logos = page.locator('img[src^="/logos/"]');
    const count = await logos.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('brand "mandate" is visible in nav', async ({ page }) => {
    // locator targets the nav logo specifically (first occurrence = nav)
    const brand = page.locator('nav').getByText('mandate');
    await expect(brand).toBeVisible();
  });

  test('all key sections are present after scrolling', async ({ page }) => {
    await scrollToBottom(page);
    for (const { selector, label } of SECTIONS) {
      const el = page.locator(selector).first();
      await expect(el, `${label} should exist in DOM`).toBeAttached({ timeout: 8_000 });
    }
  });

  test('"Join Telegram" button links to t.me', async ({ page }) => {
    await scrollToBottom(page);
    const tgBtn = page.locator('a:has-text("Join Telegram")').first();
    await expect(tgBtn).toBeVisible({ timeout: 8_000 });
    const href = await tgBtn.getAttribute('href');
    expect(href).toContain('t.me');
  });

  test('footer Telegram icon is present', async ({ page }) => {
    await scrollToBottom(page);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    const tgLink = footer.locator('a[href*="t.me"]');
    await expect(tgLink).toBeAttached({ timeout: 5_000 });
  });

  test('no horizontal overflow (no sideways scroll)', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow, 'Page should not overflow horizontally').toBe(false);
  });

  test('screenshot – full page mobile', async ({ page }, testInfo) => {
    await scrollToBottom(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const dir = path.join('tests/e2e/playwright/screenshots', testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, 'landing-full.png'),
      fullPage: true,
    });
  });
});
