/**
 * Bundle Extractor - Intercepts and analyzes JavaScript bundles
 */

import { Page } from 'playwright';
import { ExtractedBundle } from '../types/index.js';

interface InterceptedScript {
  url: string;
  content: string;
  mimeType: string;
}

/**
 * Detects the bundler type from bundle content
 */
function detectBundlerType(content: string): string {
  // Webpack detection
  if (
    content.includes('__webpack_require__') ||
    content.includes('webpackChunk') ||
    content.includes('__webpack_modules__')
  ) {
    return 'webpack';
  }

  // Vite detection
  if (
    content.includes('import.meta') ||
    content.includes('__vite') ||
    content.includes('/@vite/')
  ) {
    return 'vite';
  }

  // Parcel detection
  if (
    content.includes('parcelRequire') ||
    content.includes('$parcel$')
  ) {
    return 'parcel';
  }

  // Rollup detection
  if (
    content.includes('rollup') ||
    content.match(/\/\*\! rollup/i)
  ) {
    return 'rollup';
  }

  // esbuild detection
  if (
    content.includes('__toCommonJS') ||
    content.includes('__esm(')
  ) {
    return 'esbuild';
  }

  return 'unknown';
}

/**
 * Extracts filename from URL
 */
function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'bundle.js';
  } catch {
    return 'bundle.js';
  }
}

/**
 * Extracts all JavaScript bundles from the page
 * Note: This function sets up route interception but doesn't return bundles yet
 * Call processScripts() after page navigation to get the final bundles
 */
export async function extractBundles(page: Page): Promise<InterceptedScript[]> {
  const interceptedScripts: InterceptedScript[] = [];

  // Set up request interception for JavaScript files
  await page.route('**/*.{js,mjs,cjs}', async (route) => {
    const request = route.request();

    try {
      const response = await route.fetch();
      const contentType = response.headers()['content-type'] || '';

      // Only process JavaScript MIME types
      if (
        contentType.includes('javascript') ||
        contentType.includes('ecmascript') ||
        request.url().match(/\.m?js$/i)
      ) {
        const body = await response.body();
        const content = body.toString('utf-8');

        interceptedScripts.push({
          url: request.url(),
          content,
          mimeType: contentType,
        });

        console.log(`[BundleExtractor] Intercepted: ${request.url()} (${(content.length / 1024).toFixed(2)} KB)`);
      }

      // Continue with the request
      await route.fulfill({ response });
    } catch (error) {
      console.error(`[BundleExtractor] Error intercepting ${request.url()}:`, error);
      await route.continue();
    }
  });

  return interceptedScripts;
}

// Export the InterceptedScript type for use in index.ts
export type { InterceptedScript };

/**
 * Processes intercepted scripts into ExtractedBundle format
 */
export async function processScripts(
  page: Page,
  interceptedScripts: InterceptedScript[]
): Promise<ExtractedBundle[]> {
  // Also extract inline scripts from the page
  const inlineScripts = await page.evaluate(() => {
    const scripts: Array<{ content: string; type: string }> = [];
    document.querySelectorAll('script:not([src])').forEach((script) => {
      const content = script.textContent || '';
      const type = script.getAttribute('type') || 'text/javascript';
      if (content.trim().length > 0) {
        scripts.push({
          content,
          type,
        });
      }
    });
    return scripts;
  });

  // Add inline scripts to the collection
  inlineScripts.forEach((script, index) => {
    interceptedScripts.push({
      url: `inline-script-${index}`,
      content: script.content,
      mimeType: script.type,
    });
  });

  // Process all intercepted scripts into ExtractedBundle format
  const bundles: ExtractedBundle[] = interceptedScripts.map((script) => ({
    url: script.url,
    code: script.content,
    bundlerType: detectBundlerType(script.content),
    filename: extractFilename(script.url),
  }));

  // Sort by size (largest first)
  bundles.sort((a, b) => b.code.length - a.code.length);

  console.log(`[BundleExtractor] Extracted ${bundles.length} bundles`);
  const bundlerTypes = Array.from(new Set(bundles.map(b => b.bundlerType)));
  console.log(`[BundleExtractor] Bundler types detected:`, bundlerTypes.join(', '));

  return bundles;
}
