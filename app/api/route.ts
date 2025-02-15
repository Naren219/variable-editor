import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const targetUrl = `http://localhost:3000/generate${url.search}`;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    await browser.close();

    return new NextResponse(screenshotBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error) {
    console.error('Error generating image with Puppeteer:', error);
    return NextResponse.json(
      { error: 'Error generating image' },
      { status: 500 }
    );
  }
}
