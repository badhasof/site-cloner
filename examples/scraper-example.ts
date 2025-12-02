/**
 * Example usage of the scraper module
 */

import { scrape } from '../src/scraper/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const url = process.argv[2] || 'https://example.com';

  console.log(`\nScraping: ${url}\n`);

  try {
    // Perform the scrape
    const result = await scrape(url, {
      timeout: 60000,
      headless: true,
      viewport: { width: 1920, height: 1080 },
    });

    // Display results
    console.log('\n=== Scrape Results ===\n');
    console.log(`Title: ${result.metadata.title}`);
    console.log(`Duration: ${(result.metadata.duration / 1000).toFixed(2)}s`);
    console.log(`Timestamp: ${result.metadata.timestamp.toISOString()}\n`);

    console.log('JavaScript Bundles:');
    result.bundles.forEach((bundle, i) => {
      console.log(`  ${i + 1}. ${bundle.url}`);
      console.log(`     Size: ${(bundle.code.length / 1024).toFixed(2)} KB`);
      console.log(`     Bundler: ${bundle.bundlerType || 'unknown'}`);
    });

    console.log(`\nTotal Bundles: ${result.bundles.length}`);

    console.log('\nStylesheets:');
    result.styles.forEach((style, i) => {
      console.log(`  ${i + 1}. ${style.url} (${style.type})`);
      console.log(`     Size: ${(style.content.length / 1024).toFixed(2)} KB`);
      if (style.mediaQuery) {
        console.log(`     Media: ${style.mediaQuery}`);
      }
    });

    console.log(`\nTotal Styles: ${result.styles.length}`);

    console.log('\nAssets:');
    const assetsByType = result.assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(assetsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log(`\nTotal Assets: ${result.assets.length}`);

    // Save results to JSON
    const outputDir = './scraper-output';
    await fs.mkdir(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, 'scrape-result.json');
    await fs.writeFile(
      outputFile,
      JSON.stringify(
        {
          ...result,
          // Don't include full content in JSON (too large)
          bundles: result.bundles.map(b => ({
            url: b.url,
            size: b.code.length,
            bundlerType: b.bundlerType,
          })),
          styles: result.styles.map(s => ({
            url: s.url,
            type: s.type,
            size: s.content.length,
          })),
          html: `${result.html.substring(0, 500)}... (truncated)`,
        },
        null,
        2
      )
    );

    console.log(`\nResults saved to: ${outputFile}`);

    // Save HTML
    const htmlFile = path.join(outputDir, 'page.html');
    await fs.writeFile(htmlFile, result.html);
    console.log(`HTML saved to: ${htmlFile}`);

    // Save bundles
    const bundlesDir = path.join(outputDir, 'bundles');
    await fs.mkdir(bundlesDir, { recursive: true });

    for (let i = 0; i < result.bundles.length; i++) {
      const bundle = result.bundles[i];
      const filename = bundle.filename || `bundle-${i}.js`;
      await fs.writeFile(path.join(bundlesDir, filename), bundle.code);
    }

    console.log(`Bundles saved to: ${bundlesDir}`);

    // Save styles
    const stylesDir = path.join(outputDir, 'styles');
    await fs.mkdir(stylesDir, { recursive: true });

    for (let i = 0; i < result.styles.length; i++) {
      const style = result.styles[i];
      const filename = style.url.includes('inline')
        ? `inline-${i}.css`
        : `style-${i}.css`;
      await fs.writeFile(path.join(stylesDir, filename), style.content);
    }

    console.log(`Styles saved to: ${stylesDir}`);

    console.log('\nDone!');
  } catch (error) {
    console.error('Error during scraping:', error);
    process.exit(1);
  }
}

main();
