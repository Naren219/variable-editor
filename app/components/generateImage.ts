import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';

export async function generateImageWithPlaywright(targetUrl: string, isLocal: boolean): Promise<Buffer> {
  let browser;

  if (isLocal) {
    browser = await playwrightChromium.launch({
      headless: true,
    });
  } else {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
  const element = await page.waitForSelector('#finalGraphic', { timeout: 30000 });
  
  const screenshotBuffer = await element.screenshot({ type: 'png' });
  await browser.close();
  return screenshotBuffer;
}
