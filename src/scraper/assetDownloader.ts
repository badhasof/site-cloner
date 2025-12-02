/**
 * Asset Downloader - Downloads images, fonts, videos and other assets
 */

import { Page } from 'playwright';
import { Asset } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Determines asset type from URL or MIME type
 */
function determineAssetType(url: string, mimeType?: string): Asset['type'] {
  const urlLower = url.toLowerCase();

  if (mimeType) {
    if (mimeType.startsWith('image/svg')) return 'svg';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('font/') || mimeType.includes('font')) return 'font';
  }

  // Check URL extension
  if (urlLower.match(/\.(svg)$/i)) return 'svg';
  if (urlLower.match(/\.(png|jpg|jpeg|gif|webp|bmp|ico)$/i)) return 'image';
  if (urlLower.match(/\.(mp4|webm|ogg|mov)$/i)) return 'video';
  if (urlLower.match(/\.(woff|woff2|ttf|otf|eot)$/i)) return 'font';

  return 'other';
}

/**
 * Generates a safe filename from URL
 */
function generateFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = path.basename(pathname);

    // If no filename, generate one from hash
    if (!filename || filename === '/') {
      const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
      const ext = determineExtensionFromURL(url);
      filename = `asset-${hash}${ext}`;
    }

    // Sanitize filename
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    return filename;
  } catch {
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    return `asset-${hash}`;
  }
}

/**
 * Determines file extension from URL
 */
function determineExtensionFromURL(url: string): string {
  const match = url.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return match ? `.${match[1]}` : '';
}

/**
 * Downloads a single asset
 */
async function downloadAsset(
  url: string,
  outputDir: string
): Promise<Asset | null> {
  try {
    console.log(`[AssetDownloader] Downloading: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || undefined;
    const assetType = determineAssetType(url, contentType);

    // Create subdirectory based on asset type
    const typeDir = path.join(outputDir, `${assetType}s`);
    await fs.mkdir(typeDir, { recursive: true });

    const filename = generateFilename(url);
    const localPath = path.join(typeDir, filename);

    await fs.writeFile(localPath, Buffer.from(buffer));

    console.log(`[AssetDownloader] Saved: ${localPath} (${(buffer.byteLength / 1024).toFixed(2)} KB)`);

    return {
      url,
      type: assetType,
      localPath,
      size: buffer.byteLength,
      mimeType: contentType,
    };
  } catch (error) {
    console.error(`[AssetDownloader] Failed to download ${url}:`, error);
    return null;
  }
}

/**
 * Extracts all asset URLs from the page
 */
export async function extractAssetURLs(page: Page): Promise<string[]> {
  const assetURLs = await page.evaluate(() => {
    const urls = new Set<string>();

    // Extract image sources
    document.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (src) {
        urls.add(new URL(src, window.location.href).href);
      }
    });

    // Extract srcset images
    document.querySelectorAll('img[srcset]').forEach((img) => {
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const sources = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
        sources.forEach(src => {
          if (src) {
            urls.add(new URL(src, window.location.href).href);
          }
        });
      }
    });

    // Extract video sources
    document.querySelectorAll('video[src], source[src]').forEach((video) => {
      const src = video.getAttribute('src');
      if (src) {
        urls.add(new URL(src, window.location.href).href);
      }
    });

    // Extract background images from inline styles
    document.querySelectorAll('[style*="background"]').forEach((el) => {
      const style = el.getAttribute('style');
      if (style) {
        const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (match && match[1]) {
          urls.add(new URL(match[1], window.location.href).href);
        }
      }
    });

    // Extract background images from computed styles
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      const bgImage = computed.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const matches = Array.from(bgImage.matchAll(/url\(['"]?([^'")]+)['"]?\)/g));
        for (const match of matches) {
          if (match[1]) {
            try {
              urls.add(new URL(match[1], window.location.href).href);
            } catch {
              // Skip invalid URLs
            }
          }
        }
      }
    });

    // Extract font URLs from stylesheets
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.cssRules) continue;

        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSFontFaceRule) {
            const src = rule.style.getPropertyValue('src');
            if (src) {
              const matches = Array.from(src.matchAll(/url\(['"]?([^'")]+)['"]?\)/g));
              for (const match of matches) {
                if (match[1]) {
                  try {
                    urls.add(new URL(match[1], window.location.href).href);
                  } catch {
                    // Skip invalid URLs
                  }
                }
              }
            }
          }
        }
      } catch {
        // Cross-origin stylesheets may throw errors
      }
    }

    return Array.from(urls);
  });

  console.log(`[AssetDownloader] Found ${assetURLs.length} assets`);

  return assetURLs;
}

/**
 * Downloads all assets from the page
 */
export async function downloadAssets(
  page: Page,
  outputDir: string
): Promise<Asset[]> {
  const assetURLs = await extractAssetURLs(page);
  const assets: Asset[] = [];

  // Create assets directory
  await fs.mkdir(outputDir, { recursive: true });

  // Download assets in parallel (with concurrency limit)
  const CONCURRENCY = 5;
  const chunks = [];
  for (let i = 0; i < assetURLs.length; i += CONCURRENCY) {
    chunks.push(assetURLs.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(url => downloadAsset(url, outputDir))
    );

    results.forEach(asset => {
      if (asset) {
        assets.push(asset);
      }
    });
  }

  console.log(`[AssetDownloader] Successfully downloaded ${assets.length}/${assetURLs.length} assets`);

  return assets;
}
