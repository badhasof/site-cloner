import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { Asset } from '../types/index.js';

export async function downloadAsset(
  url: string,
  destPath: string
): Promise<void> {
  const protocol = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    protocol
      .get(url, async (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirects
          if (response.headers.location) {
            return downloadAsset(response.headers.location, destPath)
              .then(resolve)
              .catch(reject);
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(destPath), { recursive: true });

        const fileStream = await fs.open(destPath, 'w');
        const writeStream = fileStream.createWriteStream();

        response.pipe(writeStream);

        writeStream.on('finish', async () => {
          await fileStream.close();
          resolve();
        });

        writeStream.on('error', reject);
      })
      .on('error', reject);
  });
}

export async function downloadAllAssets(
  assets: Asset[],
  publicDir: string,
  options: { concurrent?: number; retry?: number } = {}
): Promise<{ success: Asset[]; failed: Array<{ asset: Asset; error: string }> }> {
  const { concurrent = 5, retry = 3 } = options;
  const success: Asset[] = [];
  const failed: Array<{ asset: Asset; error: string }> = [];

  // Process assets in batches
  for (let i = 0; i < assets.length; i += concurrent) {
    const batch = assets.slice(i, i + concurrent);
    const results = await Promise.allSettled(
      batch.map((asset) =>
        downloadAssetWithRetry(asset, publicDir, retry)
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success.push(batch[index]);
      } else {
        failed.push({
          asset: batch[index],
          error: result.reason.message,
        });
      }
    });
  }

  return { success, failed };
}

async function downloadAssetWithRetry(
  asset: Asset,
  publicDir: string,
  maxRetries: number
): Promise<void> {
  const destPath = path.join(publicDir, asset.localPath);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await downloadAsset(asset.url, destPath);
      return;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}

export function normalizeAssetPath(url: string, type: Asset['type']): string {
  const parsed = new URL(url);
  const pathname = parsed.pathname;

  // Get file extension
  const ext = path.extname(pathname) || getDefaultExtension(type);

  // Create a clean filename
  const filename =
    path.basename(pathname, path.extname(pathname)) || 'asset';
  const cleanFilename = sanitizeFilename(filename);

  // Organize by type
  const subdir = type === 'image' ? 'images' : type === 'font' ? 'fonts' : type;

  return path.join(subdir, cleanFilename + ext);
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function getDefaultExtension(type: Asset['type']): string {
  switch (type) {
    case 'image':
      return '.png';
    case 'font':
      return '.woff2';
    case 'video':
      return '.mp4';
    case 'icon':
      return '.svg';
    default:
      return '';
  }
}

export async function optimizeImage(
  imagePath: string
): Promise<void> {
  // Placeholder for image optimization
  // In production, you'd use sharp or similar library
  console.log(`TODO: Optimize image ${imagePath}`);
}

export function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number }> {
  // Placeholder for getting image dimensions
  // In production, you'd use sharp or similar library
  return Promise.resolve({ width: 0, height: 0 });
}
