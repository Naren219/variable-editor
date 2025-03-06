import { NextResponse } from 'next/server';
import { generateImagesFromCSV } from '../../components/generateImagesFromCSV';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const csvFilePath = searchParams.get('csvFilePath') || 'data.csv';
  
  searchParams.delete('csvFilePath')
  const localUrl = `http://localhost:3000/generate?${searchParams.toString()}`;
  const prodUrl = `https://variable-editor.vercel.app/generate${searchParams.toString()}`;

  const isLocal = process.env.NODE_ENV === 'development';
  const targetUrl = isLocal ? localUrl : prodUrl;
  
  try {
    const imageUrls = await generateImagesFromCSV(csvFilePath, targetUrl);
    return NextResponse.json({ imageUrls });
  } catch (err) {
    console.error('CSV: Error generating images:', err);
    return NextResponse.json(
      { error: 'CSV: Error generating images' },
      { status: 500 }
    );
  }
}
