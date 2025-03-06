import { NextResponse } from 'next/server';
// import playwright from 'playwright';
// import chromium from 'chrome-aws-lambda';
import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const localUrl = `http://localhost:3000/generate${url.search}`;
  let targetUrl = `https://variable-editor.vercel.app/generate${url.search}`
  // targetUrl = localUrl

  try {
    const executablePath = await chromium.executablePath;
    if (!executablePath) {
      throw new Error('Chromium executable not found');
    }

    const browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    // const browser = await playwright.chromium.launch({
    //   headless: true,
    // });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
    const element = await page.waitForSelector('#finalGraphic', { timeout: 30000 });

    const screenshotBuffer = await element.screenshot({ type: 'png' });
    await browser.close();
    
    return new NextResponse(screenshotBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error) {
    console.error('Error generating image with Playwright:', error);
    return NextResponse.json(
      { error: 'Error generating image' },
      { status: 500 }
    );
  }
}