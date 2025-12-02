/**
 * Main orchestration for the JSX reconstructor module
 * Converts React.createElement calls back to JSX and splits code into components
 */

import { CleanModule, DetectedComponent, ReconstructorConfig } from '../types/index.js';
import { convertToJSX } from './jsxConverter.js';
import { splitComponents } from './componentSplitter.js';
import { extractHooks } from './hookExtractor.js';

/**
 * Default configuration for the reconstructor
 */
const DEFAULT_CONFIG: ReconstructorConfig = {
  jsxOptions: {
    useFragmentShorthand: true,
    preserveComments: true,
    format: true,
  },
  componentOptions: {
    minLines: 3,
    extractInlineComponents: true,
    nameAnonymousComponents: true,
  },
  extractHooks: true,
  formatOutput: true,
};

/**
 * Reconstruct JSX components from cleaned modules
 *
 * This is the main entry point for the reconstructor module.
 * It takes deobfuscated/cleaned modules and:
 * 1. Converts React.createElement calls to JSX
 * 2. Extracts individual components
 * 3. Identifies and extracts custom hooks
 * 4. Analyzes component dependencies
 *
 * @param modules - Array of cleaned modules to process
 * @param config - Configuration options for reconstruction
 * @returns Array of detected and extracted components
 */
export async function reconstruct(
  modules: CleanModule[],
  config: ReconstructorConfig = {}
): Promise<DetectedComponent[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const allComponents: DetectedComponent[] = [];

  console.log('Reconstructing modules...', modules.length);

  for (const module of modules) {
    try {
      console.log('Processing module:', module.id);

      // Step 1: Convert createElement calls to JSX
      const jsxCode = await convertToJSX(module.code, mergedConfig.jsxOptions);

      // Step 2: Extract hooks if configured
      let processedCode = jsxCode;
      let extractedHooks: any[] = [];

      if (mergedConfig.extractHooks) {
        const hookResult = extractHooks(jsxCode);
        processedCode = hookResult.cleanedCode;
        extractedHooks = hookResult.hooks;

        if (extractedHooks.length > 0) {
          console.log('  Extracted custom hooks:', extractedHooks.length);
        }
      }

      // Step 3: Split into individual components
      const components = splitComponents(
        processedCode,
        module.id,
        mergedConfig.componentOptions
      );

      console.log('  Found components:', components.length);

      // Step 4: Add extracted hooks as pseudo-components for tracking
      for (const hook of extractedHooks) {
        const hookComponent: DetectedComponent = {
          name: hook.name,
          code: hook.code,
          type: 'function',
          hooks: [], // Hooks don't have nested hooks for tracking purposes
          dependencies: hook.dependencies,
          isExported: hook.isExported,
          moduleId: module.id,
        };
        allComponents.push(hookComponent);
      }

      // Add all components
      allComponents.push(...components);

    } catch (error) {
      console.error('Error processing module:', module.id, error);

      // Add a fallback component with the original code
      allComponents.push({
        name: 'Module_' + String(module.id),
        code: module.code,
        type: 'function',
        hooks: [],
        dependencies: [],
        isExported: false,
        moduleId: module.id,
      });
    }
  }

  console.log('Reconstruction complete. Total components/hooks:', allComponents.length);

  // Post-process: deduplicate and refine
  const refinedComponents = refineComponents(allComponents);

  return refinedComponents;
}

/**
 * Refine and deduplicate components
 */
function refineComponents(components: DetectedComponent[]): DetectedComponent[] {
  // Remove exact duplicates
  const seen = new Map<string, DetectedComponent>();

  for (const component of components) {
    const key = component.name + ':' + component.code.length;

    if (!seen.has(key)) {
      seen.set(key, component);
    } else {
      // If we've seen this component, prefer the exported version
      const existing = seen.get(key)!;
      if (component.isExported && !existing.isExported) {
        seen.set(key, component);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Reconstruct a single module (helper function)
 */
export async function reconstructModule(
  module: CleanModule,
  config: ReconstructorConfig = {}
): Promise<DetectedComponent[]> {
  return reconstruct([module], config);
}

/**
 * Get statistics about the reconstruction
 */
export function getReconstructionStats(components: DetectedComponent[]): {
  totalComponents: number;
  componentsByType: Record<string, number>;
  exportedComponents: number;
  componentsWithHooks: number;
  averageHooksPerComponent: number;
  mostUsedHooks: Array<{ name: string; count: number }>;
} {
  const componentsByType: Record<string, number> = {};
  let exportedComponents = 0;
  let componentsWithHooks = 0;
  const hookCounts = new Map<string, number>();

  for (const component of components) {
    // Count by type
    componentsByType[component.type] = (componentsByType[component.type] || 0) + 1;

    // Count exported
    if (component.isExported) {
      exportedComponents++;
    }

    // Count components with hooks
    if (component.hooks.length > 0) {
      componentsWithHooks++;

      // Track hook usage
      for (const hook of component.hooks) {
        if (hook && typeof hook === 'object' && 'name' in hook) {
          hookCounts.set(hook.name, (hookCounts.get(hook.name) || 0) + 1);
        }
      }
    }
  }

  // Calculate average hooks per component
  const totalHooks = Array.from(hookCounts.values()).reduce((sum, count) => sum + count, 0);
  const averageHooksPerComponent = componentsWithHooks > 0 ? totalHooks / componentsWithHooks : 0;

  // Get most used hooks
  const mostUsedHooks = Array.from(hookCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalComponents: components.length,
    componentsByType,
    exportedComponents,
    componentsWithHooks,
    averageHooksPerComponent,
    mostUsedHooks,
  };
}

/**
 * Export all components to separate files (returns a map of filename -> code)
 */
export function exportComponentsToFiles(
  components: DetectedComponent[],
  outputFormat: 'tsx' | 'jsx' = 'tsx'
): Map<string, string> {
  const files = new Map<string, string>();

  for (const component of components) {
    const filename = component.name + '.' + outputFormat;

    // Add imports if component uses React features
    let code = '';

    // Determine what to import from React
    const reactImports = new Set<string>();

    // Always import React for JSX
    reactImports.add('React');

    // Add hook imports
    for (const hook of component.hooks) {
      if (hook && typeof hook === 'object' && 'type' in hook && 'name' in hook) {
        if (hook.type !== 'custom') {
          reactImports.add(hook.name);
        }
      }
    }

    // Check for special component types
    if (component.type === 'forwardRef') {
      reactImports.add('forwardRef');
    } else if (component.type === 'memo') {
      reactImports.add('memo');
    }

    // Generate import statement
    if (reactImports.size > 1) {
      const imports = Array.from(reactImports).filter(i => i !== 'React');
      code += 'import React, { ' + imports.join(', ') + ' } from \'react\';\n\n';
    } else {
      code += 'import React from \'react\';\n\n';
    }

    // Add the component code
    code += component.code;

    // Add export if not already exported
    if (!component.code.includes('export')) {
      code += '\n\nexport default ' + component.name + ';';
    }

    files.set(filename, code);
  }

  return files;
}

/**
 * Generate a dependency graph for components
 */
export function generateDependencyGraph(
  components: DetectedComponent[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const component of components) {
    graph.set(component.name, component.dependencies);
  }

  return graph;
}

/**
 * Find circular dependencies in components
 */
export function findCircularDependencies(
  components: DetectedComponent[]
): Array<string[]> {
  const graph = generateDependencyGraph(components);
  const cycles: Array<string[]> = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const dependencies = graph.get(node) || [];
    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        dfs(dep, [...path]);
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        cycle.push(dep);
        cycles.push(cycle);
      }
    }

    recursionStack.delete(node);
  }

  for (const component of components) {
    if (!visited.has(component.name)) {
      dfs(component.name, []);
    }
  }

  return cycles;
}

// Re-export utilities
export { convertToJSX } from './jsxConverter.js';
export { splitComponents } from './componentSplitter.js';
export { extractHooks, analyzeHookUsage } from './hookExtractor.js';
