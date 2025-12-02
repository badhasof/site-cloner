/**
 * Module cleaning using js-deobfuscator
 */

import { deobfuscate } from 'js-deobfuscator';
import type { Module, CleanModule } from '../types/index.js';

/**
 * Configuration for js-deobfuscator
 */
export interface DeobfuscatorConfig {
  arrays: {
    unpackArrays: boolean;
    removeArrays: boolean;
  };
  proxyFunctions: {
    replaceProxyFunctions: boolean;
    removeProxyFunctions: boolean;
  };
  expressions: {
    simplifyExpressions: boolean;
    removeDeadBranches: boolean;
    undoStringOperations: boolean;
  };
  miscellaneous: {
    beautify: boolean;
    simplifyProperties: boolean;
    renameHexIdentifiers: boolean;
  };
}

/**
 * Default configuration for js-deobfuscator
 */
const DEFAULT_CONFIG: DeobfuscatorConfig = {
  arrays: {
    unpackArrays: true,
    removeArrays: true
  },
  proxyFunctions: {
    replaceProxyFunctions: true,
    removeProxyFunctions: true
  },
  expressions: {
    simplifyExpressions: true,
    removeDeadBranches: true,
    undoStringOperations: true
  },
  miscellaneous: {
    beautify: true,
    simplifyProperties: true,
    renameHexIdentifiers: true
  }
};

/**
 * Cleans and deobfuscates a module
 * @param mod - Module to clean
 * @param config - Optional custom configuration
 * @returns Cleaned module
 */
export async function cleanModule(
  mod: Module,
  config: DeobfuscatorConfig = DEFAULT_CONFIG
): Promise<CleanModule> {
  const errors: string[] = [];
  let cleanedCode = mod.code;
  let success = false;

  try {
    console.log(`[cleaner] Cleaning module ${mod.id}...`);

    // Apply deobfuscation
    const result = deobfuscate(mod.code, config);

    if (result && typeof result === 'string') {
      cleanedCode = result;
      success = true;
      console.log(`[cleaner] Successfully cleaned module ${mod.id}`);
    } else if (result !== null && typeof result === 'object' && result && 'code' in result) {
      // Some versions might return an object with a code property
      cleanedCode = (result as any).code;
      success = true;
      console.log(`[cleaner] Successfully cleaned module ${mod.id}`);
    } else {
      errors.push('Deobfuscation returned unexpected result type');
      console.warn(`[cleaner] Unexpected result type for module ${mod.id}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Deobfuscation failed: ${errorMessage}`);
    console.error(`[cleaner] Error cleaning module ${mod.id}:`, errorMessage);

    // Try a simpler approach - just beautify
    try {
      const simpleConfig: DeobfuscatorConfig = {
        arrays: {
          unpackArrays: false,
          removeArrays: false
        },
        proxyFunctions: {
          replaceProxyFunctions: false,
          removeProxyFunctions: false
        },
        expressions: {
          simplifyExpressions: false,
          removeDeadBranches: false,
          undoStringOperations: false
        },
        miscellaneous: {
          beautify: true,
          simplifyProperties: false,
          renameHexIdentifiers: false
        }
      };

      const simpleResult = deobfuscate(mod.code, simpleConfig);

      if (simpleResult && typeof simpleResult === 'string') {
        cleanedCode = simpleResult;
        success = true;
        console.log(`[cleaner] Module ${mod.id} cleaned with simple config`);
      } else if (simpleResult !== null && typeof simpleResult === 'object' && simpleResult && 'code' in simpleResult) {
        cleanedCode = (simpleResult as any).code;
        success = true;
        console.log(`[cleaner] Module ${mod.id} cleaned with simple config`);
      }
    } catch (simpleError) {
      const simpleErrorMessage = simpleError instanceof Error ? simpleError.message : String(simpleError);
      errors.push(`Simple deobfuscation also failed: ${simpleErrorMessage}`);
      console.error(`[cleaner] Simple config also failed for module ${mod.id}:`, simpleErrorMessage);
      // Keep original code
      cleanedCode = mod.code;
    }
  }

  return {
    id: mod.id,
    code: cleanedCode,
    original: mod,
    success: success,
    errors: errors.length > 0 ? errors : undefined,
    sourceBundle: mod.sourceBundle
  };
}

/**
 * Cleans multiple modules in parallel with error handling
 * @param modules - Array of modules to clean
 * @param config - Optional custom configuration
 * @returns Array of cleaned modules
 */
export async function cleanModules(
  modules: Module[],
  config: DeobfuscatorConfig = DEFAULT_CONFIG
): Promise<CleanModule[]> {
  console.log(`[cleaner] Cleaning ${modules.length} modules...`);

  // Process modules with Promise.allSettled to handle failures gracefully
  const results = await Promise.allSettled(
    modules.map(mod => cleanModule(mod, config))
  );

  const cleanedModules: CleanModule[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (result.status === 'fulfilled') {
      cleanedModules.push(result.value);
    } else {
      // If promise rejected, create a failed CleanModule
      const originalModule = modules[i];
      console.error(`[cleaner] Failed to clean module ${originalModule.id}:`, result.reason);

      cleanedModules.push({
        id: originalModule.id,
        code: originalModule.code,
        original: originalModule,
        success: false,
        errors: [result.reason instanceof Error ? result.reason.message : String(result.reason)],
        sourceBundle: originalModule.sourceBundle
      });
    }
  }

  const successCount = cleanedModules.filter(m => m.success).length;
  console.log(`[cleaner] Successfully cleaned ${successCount}/${modules.length} modules`);

  return cleanedModules;
}

/**
 * Normalize variable names in code (utility function)
 * @param code - Code to normalize
 * @returns Normalized code
 */
export function normalizeVariableNames(code: string): string {
  // This is a placeholder for more advanced variable normalization
  // For now, it just returns the code as-is
  // Could be enhanced to rename short variable names to more descriptive ones
  return code;
}
