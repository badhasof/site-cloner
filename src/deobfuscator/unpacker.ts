/**
 * Bundle unpacking using webcrack
 */

import { webcrack } from 'webcrack';
import type { Module } from '../types/index.js';

/**
 * Unpacks a bundle into individual modules
 * @param code - Bundled/minified code
 * @param bundlerType - Type of bundler (webpack, rollup, etc.)
 * @returns Array of extracted modules
 */
export async function unpackBundle(
  code: string,
  bundlerType: string = 'unknown'
): Promise<Module[]> {
  const modules: Module[] = [];

  try {
    console.log(`[unpacker] Attempting to unpack bundle (type: ${bundlerType})...`);

    // Use webcrack to unpack and deobfuscate
    const result = await webcrack(code);

    // Check if webcrack detected a bundle
    if (result.bundle) {
      console.log(`[unpacker] Webcrack detected bundle, extracting modules...`);

      // Extract modules from the bundle
      const bundleModules = result.bundle.modules;

      if (bundleModules && bundleModules.size > 0) {
        console.log(`[unpacker] Found ${bundleModules.size} modules in bundle`);

        // Convert entries to array to avoid downlevelIteration requirement
        bundleModules.forEach((module: any, id: any) => {
          modules.push({
            id: id,
            code: module.code || '',
            dependencies: (module as any).dependencies || []
          });
        });
      } else {
        console.log('[unpacker] Bundle detected but no modules found');
      }
    } else {
      console.log('[unpacker] No bundle detected by webcrack, attempting manual extraction...');

      // Fallback: try to detect webpack IIFE pattern and extract modules manually
      const manualModules = extractWebpackModulesManually(code);

      if (manualModules.length > 0) {
        console.log(`[unpacker] Manually extracted ${manualModules.length} modules`);
        modules.push(...manualModules);
      } else {
        // If no modules found, treat entire code as single module
        console.log('[unpacker] No modules detected, treating as single module');
        modules.push({
          id: 0,
          code: result.code || code
        });
      }
    }
  } catch (error) {
    console.error('[unpacker] Error during unpacking:', error);

    // Fallback: try manual extraction
    try {
      const manualModules = extractWebpackModulesManually(code);

      if (manualModules.length > 0) {
        console.log(`[unpacker] Fallback: manually extracted ${manualModules.length} modules`);
        modules.push(...manualModules);
      } else {
        // Last resort: return original code as single module
        console.log('[unpacker] Fallback: returning original code as single module');
        modules.push({
          id: 0,
          code: code
        });
      }
    } catch (fallbackError) {
      console.error('[unpacker] Fallback extraction also failed:', fallbackError);
      // Return original code as single module
      modules.push({
        id: 0,
        code: code
      });
    }
  }

  return modules;
}

/**
 * Manually extract modules from webpack IIFE pattern
 * Looks for patterns like: {0: function(module, exports) {...}, 1: function(...) {...}}
 */
function extractWebpackModulesManually(code: string): Module[] {
  const modules: Module[] = [];

  try {
    // Pattern 1: Webpack 4/5 style - Object with numeric keys
    // {0:function(e,t,n){...},1:function(e,t,n){...}}
    const webpackPattern = /\{(\s*\d+\s*:\s*function[^}]*\{[\s\S]*?\}\s*,?\s*)+\}/g;
    const matches = code.match(webpackPattern);

    if (matches && matches.length > 0) {
      // Take the largest match (most likely the main bundle)
      const bundleObject = matches.reduce((a, b) => a.length > b.length ? a : b);

      // Extract individual modules
      const modulePattern = /(\d+)\s*:\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\}(?=\s*,\s*\d+\s*:|$)/g;
      let match;

      while ((match = modulePattern.exec(bundleObject)) !== null) {
        const id = parseInt(match[1], 10);
        const moduleCode = match[2];

        modules.push({
          id: id,
          code: moduleCode.trim()
        });
      }
    }

    // Pattern 2: Array-based webpack bundles
    // [function(e,t,n){...}, function(e,t,n){...}]
    if (modules.length === 0) {
      const arrayPattern = /\[\s*function\s*\([^)]*\)\s*\{[\s\S]*?\}\s*(,\s*function\s*\([^)]*\)\s*\{[\s\S]*?\}\s*)*\]/g;
      const arrayMatches = code.match(arrayPattern);

      if (arrayMatches && arrayMatches.length > 0) {
        const bundleArray = arrayMatches.reduce((a, b) => a.length > b.length ? a : b);

        const funcPattern = /function\s*\([^)]*\)\s*\{([\s\S]*?)\}(?=\s*,|\s*\])/g;
        let funcMatch;
        let index = 0;

        while ((funcMatch = funcPattern.exec(bundleArray)) !== null) {
          modules.push({
            id: index++,
            code: funcMatch[1].trim()
          });
        }
      }
    }
  } catch (error) {
    console.error('[unpacker] Error in manual extraction:', error);
  }

  return modules;
}

/**
 * Unpack webpack-specific bundles
 * @param code - Webpack bundled code
 * @returns Array of module strings
 */
export async function unpackWebpack(code: string): Promise<string[]> {
  const modules = await unpackBundle(code, 'webpack');
  return modules.map(m => m.code);
}

/**
 * Generic unpacker for non-webpack bundles
 * @param code - Bundled code
 * @returns Array of module strings
 */
export async function unpackGeneric(code: string): Promise<string[]> {
  const modules = await unpackBundle(code, 'unknown');
  return modules.map(m => m.code);
}
