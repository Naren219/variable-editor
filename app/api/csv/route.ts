import { NextResponse } from 'next/server';
import { generateImagesFromCSV } from '../../components/generateImagesFromCSV';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/app/firebase';

export const maxDuration = 20;

export async function POST(req: Request) {
  const url = new URL(req.url);
  
  const localUrl = `http://localhost:3000/generate${url.search}`;
  const prodUrl = `https://variable-editor.vercel.app/generate${url.search}`;

  const isLocal = process.env.NODE_ENV === 'development';
  const targetUrl = isLocal ? localUrl : prodUrl;
  const targetUrlObj = new URL(targetUrl);

  const formData = await req.formData();
  const csvFile = formData.get('csvFile');
  if (!csvFile) {
    return new Response(JSON.stringify({ error: "Missing CSV file" }), { status: 400 });
  }
  const csvData = await (csvFile as Blob).text();

  const graphicFile = formData.get('graphicFile');
  
  if (graphicFile && graphicFile instanceof File) {
    const fileBuffer = await graphicFile.arrayBuffer();
    const graphicName = `graphics/${Date.now()}-${graphicFile.name}`;
    const fileRef = ref(storage, graphicName);
    await uploadBytes(fileRef, new Uint8Array(fileBuffer));
    
    targetUrlObj.searchParams.set("graphicName", graphicName);
  }

  for (const [key, value] of formData.entries()) {
    if (value instanceof File && key !== 'csvFile' && key !== 'graphicFile') {
      const fileBuffer = await value.arrayBuffer();
      const imageName = `images/${Date.now()}-${value.name}`;
      const fileRef = ref(storage, imageName);
      await uploadBytes(fileRef, new Uint8Array(fileBuffer));
      
      targetUrlObj.searchParams.set(key, imageName);
    }
  }
  console.log('Final URL:', targetUrlObj.toString());
  try {
    const imageUrls = await generateImagesFromCSV(csvData, targetUrlObj.toString());
    return NextResponse.json({ imageUrls });
  } catch (err) {
    console.error('CSV: Error generating images:', err);
    return NextResponse.json(
      { error: 'CSV: Error generating images' },
      { status: 500 }
    );
  }
}
