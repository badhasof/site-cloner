/**
 * Deobfuscator pipeline orchestration
 * Chains webcrack, wakaru, and js-deobfuscator to clean bundled/minified code
 */

import type { ExtractedBundle, CleanModule, Module } from '../types/index.js';
import { unpackBundle } from './unpacker.js';
import { cleanModules } from './cleaner.js';

/**
 * Check if Node.js version is 22 or higher (required for webcrack)
 */
function checkNodeVersion(): void {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0], 10);

  if (majorVersion < 22) {
    throw new Error(
      `Node.js 22 or higher is required for webcrack. Current version: ${version}`
    );
  }
}

/**
 * Main deobfuscation pipeline
 * @param bundles - Array of extracted bundles to deobfuscate
 * @returns Array of clean, deobfuscated modules
 */
export async function deobfuscate(bundles: ExtractedBundle[]): Promise<CleanModule[]> {
  // Check Node.js version
  checkNodeVersion();

  console.log(`[deobfuscator] Starting deobfuscation pipeline for ${bundles.length} bundles...`);

  const allCleanModules: CleanModule[] = [];

  for (let i = 0; i < bundles.length; i++) {
    const bundle = bundles[i];

    try {
      console.log(
        `\n[deobfuscator] Processing bundle ${i + 1}/${bundles.length}: ${bundle.filename || bundle.url}`
      );

      // Step 1: Unpack the bundle into modules
      console.log('[deobfuscator] Step 1: Unpacking bundle...');
      const modules = await unpackBundle(bundle.code, bundle.bundlerType || 'unknown');

      if (modules.length === 0) {
        console.warn(`[deobfuscator] No modules extracted from bundle: ${bundle.url}`);
        continue;
      }

      // Add source bundle reference to modules
      const modulesWithSource: Module[] = modules.map(mod => ({
        ...mod,
        sourceBundle: bundle.url
      }));

      console.log(`[deobfuscator] Extracted ${modules.length} modules from bundle`);

      // Step 2: Clean each module
      console.log('[deobfuscator] Step 2: Cleaning modules...');
      const cleanedModules = await cleanModules(modulesWithSource);

      allCleanModules.push(...cleanedModules);

      console.log(
        `[deobfuscator] Completed bundle ${i + 1}/${bundles.length}: ` +
        `${cleanedModules.filter(m => m.success).length}/${cleanedModules.length} modules cleaned successfully`
      );
    } catch (error) {
      console.error(
        `[deobfuscator] Error processing bundle ${bundle.url}:`,
        error instanceof Error ? error.message : String(error)
      );

      // Continue with other bundles even if one fails
      continue;
    }
  }

  // Print summary
  const successCount = allCleanModules.filter(m => m.success).length;
  console.log(
    `\n[deobfuscator] Pipeline complete: ${successCount}/${allCleanModules.length} modules cleaned successfully`
  );

  return allCleanModules;
}

/**
 * Export utility functions for convenience
 */
export { unpackBundle } from './unpacker.js';
export { cleanModule, cleanModules } from './cleaner.js';

/**
 * Analyze obfuscation type and confidence
 * @param code - Code to analyze
 * @returns Obfuscation type and confidence score
 */
export function analyzeObfuscation(code: string): { type: string; confidence: number } {
  let type = 'unknown';
  let confidence = 0;

  // Detect common obfuscation patterns
  const patterns = {
    'javascript-obfuscator': /(_0x[a-f0-9]+|\\x[0-9a-f]{2})/i,
    'webpack': /(webpackJsonp|__webpack_require__|__webpack_modules__)/,
    'uglify': /[a-z]\$[0-9]+/,
    'terser': /(function\s*\(\w\)\{|\w=>\{)/,
    'obfuscator.io': /_0x[a-f0-9]{4,}/,
  };

  for (const [patternType, regex] of Object.entries(patterns)) {
    const matches = code.match(regex);
    if (matches) {
      type = patternType;
      confidence = Math.min(matches.length / 10, 1);
      break;
    }
  }

  return { type, confidence };
}
