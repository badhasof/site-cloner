/**
 * Main API entry point for site-cloner
 * Orchestrates the complete website cloning pipeline
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { URL } from 'url';
import ora from 'ora';
import chalk from 'chalk';
import type {
  CloneOptions,
  CloneResult,
  ScrapeResult,
  ExtractedBundle,
  CleanModule,
  DetectedComponent,
  ProcessedStyles,
  AnimationResult
} from './types/index.js';

// Import modules
import { scrape } from './scraper/index.js';
import { deobfuscate } from './deobfuscator/index.js';
import { reconstruct } from './reconstructor/index.js';
import { processStyles } from './styler/index.js';
import { extractAnimations } from './animations/index.js';
import { generateProject } from './generator/index.js';
import { chromium } from 'playwright';

/**
 * Validate and normalize URL
 */
function validateUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    if (!url.protocol.startsWith('http')) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }
    return url.href;
  } catch (error) {
    throw new Error(`Invalid URL: ${urlString}`);
  }
}

/**
 * Get output directory path
 */
function getOutputDir(url: string, customOutput?: string): string {
  if (customOutput) {
    return path.resolve(customOutput);
  }

  // Extract domain from URL
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace(/^www\./, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  return path.resolve(process.cwd(), 'output', `${domain}-${timestamp}`);
}

/**
 * Clone a website and convert it to a React + Tailwind project
 *
 * @param url - The URL of the website to clone
 * @param options - Cloning options
 * @returns Result object with output directory and statistics
 */
export async function cloneSite(
  url: string,
  options: CloneOptions = {}
): Promise<CloneResult> {
  const errors: string[] = [];
  const verbose = options.verbose || false;

  // Helper for logging
  const log = (message: string, force = false) => {
    if (verbose || force) {
      console.log(message);
    }
  };

  try {
    // Step 1: Validate URL
    log(chalk.gray('\n[1/7] Validating URL...'));
    const validatedUrl = validateUrl(url);
    log(chalk.green(`✓ URL validated: ${validatedUrl}`));

    // Step 2: Create output directory
    log(chalk.gray('\n[2/7] Creating output directory...'));
    const outputDir = getOutputDir(validatedUrl, options.output);
    await fs.mkdir(outputDir, { recursive: true });
    log(chalk.green(`✓ Output directory: ${outputDir}`));

    // Step 3: Scrape website
    log(chalk.gray('\n[3/7] Scraping website...'));
    const spinner = verbose ? null : ora('Scraping website...').start();

    let scrapeResult: ScrapeResult;
    try {
      scrapeResult = await scrape(validatedUrl, {
        timeout: options.timeout || 30000,
        headless: options.headless !== false,
      });

      spinner?.succeed(chalk.green('✓ Website scraped'));
      log(chalk.green(`✓ Found ${scrapeResult.bundles.length} bundles, ${scrapeResult.styles.length} stylesheets, ${scrapeResult.assets.length} assets`));
    } catch (error) {
      spinner?.fail(chalk.red('✗ Scraping failed'));
      throw error;
    }

    // Step 4: Deobfuscate bundles
    log(chalk.gray('\n[4/7] Deobfuscating code...'));
    const deobfuscateSpinner = verbose ? null : ora('Deobfuscating bundles...').start();

    let cleanModules: CleanModule[] = [];
    try {
      if (scrapeResult.bundles.length > 0) {
        cleanModules = await deobfuscate(scrapeResult.bundles);

        const successCount = cleanModules.filter(m => m.success).length;
        deobfuscateSpinner?.succeed(chalk.green(`✓ Deobfuscated ${successCount}/${cleanModules.length} modules`));
        log(chalk.green(`✓ Deobfuscation complete: ${successCount}/${cleanModules.length} successful`));
      } else {
        deobfuscateSpinner?.warn(chalk.yellow('! No bundles to deobfuscate'));
        log(chalk.yellow('⚠ No JavaScript bundles found'));
        errors.push('No JavaScript bundles found to deobfuscate');
      }
    } catch (error) {
      deobfuscateSpinner?.fail(chalk.red('✗ Deobfuscation failed'));
      errors.push(`Deobfuscation error: ${error instanceof Error ? error.message : String(error)}`);
      log(chalk.yellow(`⚠ Deobfuscation failed, continuing with original code`));
    }

    // Step 5: Reconstruct React components
    log(chalk.gray('\n[5/7] Converting to JSX...'));
    const reconstructSpinner = verbose ? null : ora('Reconstructing React components...').start();

    let components: DetectedComponent[] = [];
    try {
      if (cleanModules.length > 0) {
        components = await reconstruct(cleanModules);

        reconstructSpinner?.succeed(chalk.green(`✓ Extracted ${components.length} components`));
        log(chalk.green(`✓ Component reconstruction complete: ${components.length} components`));
      } else {
        reconstructSpinner?.warn(chalk.yellow('! No modules to reconstruct'));
        log(chalk.yellow('⚠ No modules available for component reconstruction'));
        errors.push('No modules available for component reconstruction');
      }
    } catch (error) {
      reconstructSpinner?.fail(chalk.red('✗ Reconstruction failed'));
      errors.push(`Reconstruction error: ${error instanceof Error ? error.message : String(error)}`);
      log(chalk.yellow(`⚠ Component reconstruction failed`));
    }

    // Step 6: Process styles (with URL rewriting)
    log(chalk.gray('\n[6/7] Processing styles...'));
    const stylesSpinner = verbose ? null : ora('Converting CSS to Tailwind...').start();

    let processedStyles: ProcessedStyles | null = null;
    try {
      if (scrapeResult.styles.length > 0) {
        // Import URLMapper for CSS URL rewriting
        const { URLMapper } = await import('./utils/urlRewriter.js');
        const urlMapper = new URLMapper(scrapeResult.assets);

        processedStyles = await processStyles(scrapeResult.styles, undefined, urlMapper);

        stylesSpinner?.succeed(chalk.green('✓ Styles processed'));
        log(chalk.green('✓ CSS converted to Tailwind (with URL rewriting)'));
      } else {
        stylesSpinner?.warn(chalk.yellow('! No styles to process'));
        log(chalk.yellow('⚠ No stylesheets found'));
        errors.push('No stylesheets found to process');
      }
    } catch (error) {
      stylesSpinner?.fail(chalk.red('✗ Style processing failed'));
      errors.push(`Style processing error: ${error instanceof Error ? error.message : String(error)}`);
      log(chalk.yellow(`⚠ Style processing failed`));
    }

    // Step 7: Capture animations (optional)
    let animationResult: AnimationResult | null = null;
    if (options.includeAnimations !== false) {
      log(chalk.gray('\n[7/7] Capturing animations...'));
      const animSpinner = verbose ? null : ora('Extracting animations...').start();

      try {
        // Re-launch browser for animation extraction
        const browser = await chromium.launch({
          headless: options.headless !== false,
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(validatedUrl, { timeout: options.timeout || 30000 });

        // Extract animations from the page
        const animStyles = {
          css: scrapeResult.styles.map(s => s.content).join('\n'),
          computedStyles: new Map(),
          stylesheets: scrapeResult.styles.map(s => s.url)
        };
        animationResult = await extractAnimations(page, animStyles);

        await browser.close();

        animSpinner?.succeed(chalk.green(`✓ Captured ${animationResult.animations.length} animations`));
        log(chalk.green(`✓ Animation capture complete: ${animationResult.animations.length} animations`));
      } catch (error) {
        animSpinner?.fail(chalk.red('✗ Animation capture failed'));
        errors.push(`Animation capture error: ${error instanceof Error ? error.message : String(error)}`);
        log(chalk.yellow(`⚠ Animation capture failed`));
        // Provide fallback empty result
        animationResult = {
          animations: [],
          framerMotionCode: '',
          cssAnimations: [],
          scrollAnimations: []
        };
      }
    } else {
      log(chalk.gray('\n[7/7] Skipping animations (disabled)'));
    }

    // Step 8: Generate project
    log(chalk.gray('\n[8/8] Generating project...'));
    const genSpinner = verbose ? null : ora('Generating Vite + React project...').start();

    try {
      // Provide defaults for missing data
      const defaultStyles: ProcessedStyles = {
        classMap: new Map(),
        tailwindClasses: [],
        customCSS: '',
        cssVariables: {},
        mappings: [],
        config: {},
        animations: []
      };

      const defaultAnimations: AnimationResult = {
        animations: [],
        framerMotionCode: '',
        cssAnimations: [],
        scrollAnimations: []
      };

      await generateProject({
        outputDir,
        components,
        styles: processedStyles || defaultStyles,
        animations: animationResult || defaultAnimations,
        assets: scrapeResult.assets,
        html: scrapeResult.html,
        includeAssets: options.includeAssets !== false,
        extractedHTML: scrapeResult.extractedHTML
      });

      genSpinner?.succeed(chalk.green('✓ Project generated'));
      log(chalk.green(`✓ Project files written to ${outputDir}`));
    } catch (error) {
      genSpinner?.fail(chalk.red('✗ Project generation failed'));
      throw error;
    }

    // Return result
    return {
      outputDir,
      components: components.length,
      assets: options.includeAssets !== false ? scrapeResult.assets.length : 0,
      success: true,
      errors
    };

  } catch (error) {
    // Fatal error - add to errors and rethrow
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);

    throw new Error(`Site cloning failed: ${errorMessage}`);
  }
}

// Re-export types for convenience
export * from './types/index.js';

// Re-export modules for programmatic use
// export * from './scraper/index.js';
// export * from './deobfuscator/index.js';
// export * from './reconstructor/index.js';
// export * from './styler/index.js';
// export * from './animations/index.js';
// export * from './generator/index.js';
