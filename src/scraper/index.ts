/**
 * Main scraper module - orchestrates page scraping with Playwright
 */

import { chromium, Browser, Page } from 'playwright';
import { ScrapeResult, ScrapeOptions } from '../types/index.js';
import { processScripts, type InterceptedScript } from './bundleExtractor.js';
import { extractStyles } from './styleExtractor.js';
import { downloadAssets } from './assetDownloader.js';
import { extractHTMLContent } from './htmlExtractor.js';
import * as os from 'os';
import * as path from 'path';

/**
 * Main scrape function - orchestrates the entire scraping process
 */
export async function scrape(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const startTime = Date.now();
  console.log(`[Scraper] Starting scrape of ${url}`);

  // Default options
  const {
    timeout = 30000,
    headless = true,
    viewport = { width: 1920, height: 1080 },
    userAgent,
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log('[Scraper] Launching browser...');
    browser = await chromium.launch({
      headless,
    });

    const context = await browser.newContext({
      viewport,
      userAgent,
    });

    page = await context.newPage();

    // Set up request interception and collect scripts
    console.log('[Scraper] Setting up request interception...');
    const interceptedScripts: InterceptedScript[] = [];

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

    // Navigate to URL and wait for network idle
    console.log(`[Scraper] Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout,
    });

    console.log('[Scraper] Page loaded successfully');

    // Extract page title
    const title = await page.title();
    console.log(`[Scraper] Page title: ${title}`);

    // Process intercepted scripts
    console.log('[Scraper] Processing JavaScript bundles...');
    const bundles = await processScripts(page, interceptedScripts);

    // Extract styles
    console.log('[Scraper] Extracting styles...');
    const styles = await extractStyles(page);

    // Download assets
    console.log('[Scraper] Downloading assets...');
    const tempDir = path.join(os.tmpdir(), `site-cloner-${Date.now()}`);
    const assets = await downloadAssets(page, tempDir);

    // Get HTML content
    console.log('[Scraper] Extracting HTML...');
    const html = await page.content();

    // Extract structured HTML content with computed styles
    console.log('[Scraper] Extracting structured HTML content...');
    const extractedHTML = await extractHTMLContent(page);

    const duration = Date.now() - startTime;
    console.log(`[Scraper] Scraping completed in ${(duration / 1000).toFixed(2)}s`);

    return {
      url,
      html,
      bundles,
      styles,
      assets,
      metadata: {
        timestamp: new Date(),
        duration,
        title,
      },
      extractedHTML,
    };
  } catch (error) {
    console.error('[Scraper] Error during scraping:', error);
    throw error;
  } finally {
    // Clean up
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
      console.log('[Scraper] Browser closed');
    }
  }
}

/**
 * Scrapes a site with default options (convenience wrapper)
 */
export async function scrapeSite(url: string): Promise<ScrapeResult> {
  return scrape(url);
}

// Re-export types
export type { ScrapeResult, ScrapeOptions } from '../types/index.js';
