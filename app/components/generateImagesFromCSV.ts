import { generateImageWithPlaywright } from './generateImage';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';
import csv from 'csv-parser';
import { Readable } from 'stream';

export interface RowData {
  [key: string]: string;
}

const isLocal = process.env.NODE_ENV === 'development';

function parseCSVWithCsvParser(csvText: string): Promise<RowData[]> {
  return new Promise((resolve, reject) => {
    const rows: RowData[] = [];
    Readable.from([csvText])
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

/**
 * For each row, construct a query string from the dynamic keys and launch a browser to generate an image.
 */
async function generateImageForRow(row: RowData, urlTemplate: string): Promise<string | void> {
  const urlObj = new URL(urlTemplate);
  for (const [key, placeholder] of urlObj.searchParams.entries()) {
    const imgFile = decodeURIComponent(placeholder)
    if (key !== 'graphicUrl' && !imgFile.startsWith('images/')) { // don't want to override image paths
      if (row[placeholder] !== undefined) {
        urlObj.searchParams.set(key, row[placeholder]);
      } else if (row[key] !== undefined) {
        urlObj.searchParams.set(key, row[key]);
      }
    }
  }
  const targetUrl = urlObj.toString();
  
  console.log(`Generating image for URL: ${targetUrl}`);
  
  try {
    const screenshotBuffer = await generateImageWithPlaywright(targetUrl, isLocal);
    
    const fileName = `${row['projectId']}_image_${Date.now()}.png`
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, screenshotBuffer);
    const publicUrl = await getDownloadURL(storageRef);
    return publicUrl

    // if we want to use local files
    // if (isLocal) {
    //   const outputDir = path.join(process.cwd(), 'screenshots');
    //   if (!fs.existsSync(outputDir)) {
    //     fs.mkdirSync(outputDir);
    //   }
    //   const outputPath = path.join(outputDir, fileName);
    //   fs.writeFileSync(outputPath, screenshotBuffer);
    //   console.log(`Saved image to ${outputPath}`);
    // }
  } catch (err) {
    console.error('Error generating image for row:', err);
  }
}

/**
 * Reads the CSV file at csvFilePath, and for each row uses the dynamicKeys to generate an image.
 */
export async function generateImagesFromCSV(csvData: string, urlTemplate: string): Promise<string[]> {
  const rows = await parseCSVWithCsvParser(csvData);
  
  const imageUrls: string[] = [];

  for (const row of rows) {
    try {
          const imageUrl = await generateImageForRow(row, urlTemplate);
      if (imageUrl) {
        imageUrls.push(imageUrl);
        }
    } catch (error) {
      console.error('Error processing row:', row, error);
    }
  }
  return(imageUrls);
}