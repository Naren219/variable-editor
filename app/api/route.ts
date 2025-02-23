import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const targetUrl = `https://variable-editor.vercel.app/generate${url.search}` // `http://localhost:3000/generate${url.search}`;

  try {
    const browser = await chromium.launch({ headless: true });
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

export async function POST(req: Request) {
  try {
    // Parse the JSON body directly and encode for the generation URL.
    const data = await req.json();
    const json = JSON.stringify(data);
    const encoded = encodeURIComponent(json);
    const targetUrl = `http://localhost:3000/generate?data=${encoded}`;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('#finalGraphic');
    const element = await page.$('#finalGraphic');
    
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    await browser.close();

    return new NextResponse(screenshotBuffer, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (error) {
    console.error('Error generating image with Playwright:', error);
    return NextResponse.json({ error: 'Error generating image' }, { status: 500 });
  }
}

