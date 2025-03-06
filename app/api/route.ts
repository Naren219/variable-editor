import { NextResponse } from 'next/server';
import { generateImageWithPlaywright } from '../components/generateImage';

export const maxDuration = 20;

export async function GET(req: Request) {
  const url = new URL(req.url);

  const localUrl = `http://localhost:3000/generate${url.search}`;
  const prodUrl = `https://variable-editor.vercel.app/generate${url.search}`

  const isLocal = process.env.NODE_ENV === 'development';
  const targetUrl = isLocal ? localUrl : prodUrl;

  try {
    const screenshotBuffer = await generateImageWithPlaywright(targetUrl, isLocal);
    
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