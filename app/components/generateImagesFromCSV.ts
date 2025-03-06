// generateImagesFromCSV.ts
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { generateImageWithPlaywright } from './generateImage';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

export interface RowData {
  [key: string]: string;
}

/**
 * For each row, construct a query string from the dynamic keys and launch a browser to generate an image.
 */
async function generateImageForRow(row: RowData, urlTemplate: string): Promise<string | void> {
  const urlObj = new URL(urlTemplate);
  for (const [key, placeholder] of urlObj.searchParams.entries()) {
      if (row[placeholder] !== undefined) {
        urlObj.searchParams.set(key, row[placeholder]);
      } else if (row[key] !== undefined) {
        urlObj.searchParams.set(key, row[key]);
      }
  }
  const targetUrl = urlObj.toString();
  
  console.log(`Generating image for URL: ${targetUrl}`);
  const isLocal = process.env.NODE_ENV === 'development';
  
  try {
    const screenshotBuffer = await generateImageWithPlaywright(targetUrl, isLocal);
    
    const fileName = `${row['projectId']}_image_${Date.now()}.png`
    if (isLocal) {
      const outputDir = path.join(process.cwd(), 'screenshots');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      const outputPath = path.join(outputDir, fileName);
      fs.writeFileSync(outputPath, screenshotBuffer);
      console.log(`Saved image to ${outputPath}`);
    } else {
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, screenshotBuffer);
      const publicUrl = await getDownloadURL(storageRef);
      return publicUrl
    }
  } catch (err) {
    console.error('Error generating image for row:', err);
  }
}

/**
 * Reads the CSV file at csvFilePath, and for each row uses the dynamicKeys to generate an image.
 */
export async function generateImagesFromCSV(csvFilePath: string, urlTemplate: string): Promise<string[]> {
  return new Promise((resolve, reject) => {

    const absoluteFilePath = path.resolve(csvFilePath);

    // Check if file exists before reading
    if (!fs.existsSync(absoluteFilePath)) {
      console.error('Error: CSV file not found at', absoluteFilePath);
      return reject(new Error(`CSV file not found at ${absoluteFilePath}`));
    }

    const rows: RowData[] = [];
    const imageUrls: string[] = [];
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data: RowData) => {
        rows.push(data);
      })
      .on('end', async () => {
        for (const row of rows) {
          const imageUrl = await generateImageForRow(row, urlTemplate);
          if (imageUrl) imageUrls.push(imageUrl);
        }
        resolve(imageUrls);
      })
      .on('error', (err) => {
        console.error('Error reading CSV:', err);
        reject(err);
      });
  });
}