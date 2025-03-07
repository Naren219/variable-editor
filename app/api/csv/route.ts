import { NextResponse } from 'next/server';
import { generateImagesFromCSV } from '../../components/generateImagesFromCSV';

export const maxDuration = 20;

export async function POST(req: Request) {
  const url = new URL(req.url);
  
  const localUrl = `http://localhost:3000/generate${url.search}`;
  const prodUrl = `https://variable-editor.vercel.app/generate${url.search}`;

  const isLocal = process.env.NODE_ENV === 'development';
  const targetUrl = isLocal ? localUrl : prodUrl;
  
  const csvData = await req.text();
  
  try {
    const imageUrls = await generateImagesFromCSV(csvData, targetUrl);
    return NextResponse.json({ imageUrls });
  } catch (err) {
    console.error('CSV: Error generating images:', err);
    return NextResponse.json(
      { error: 'CSV: Error generating images' },
      { status: 500 }
    );
  }
}
