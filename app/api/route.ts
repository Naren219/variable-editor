import { NextResponse } from 'next/server';
import * as playwright from 'playwright';
import chromium from 'chrome-aws-lambda';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const targetUrl = `https://variable-editor.vercel.app/generate${url.search}` // `http://localhost:3000/generate${url.search}`;

  try {
    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
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