# Deobfuscator Module - Quick Reference

## Installation

```bash
cd /Users/bgf/site-cloner
npm install
```

**Requirements**: Node.js 22+ (enforced at runtime)

## Main API

### Primary Function

```typescript
import { deobfuscate } from './deobfuscator/index.js';

const cleanModules = await deobfuscate(bundles);
```

### All Exports

```typescript
// Main pipeline
export async function deobfuscate(
  bundles: ExtractedBundle[]
): Promise<CleanModule[]>

// Bundle unpacking
export async function unpackBundle(
  code: string,
  bundlerType?: string
): Promise<Module[]>

// Module cleaning
export async function cleanModule(
  mod: Module,
  config?: DeobfuscatorConfig
): Promise<CleanModule>

export async function cleanModules(
  modules: Module[],
  config?: DeobfuscatorConfig
): Promise<CleanModule[]>

// Utilities
export function analyzeObfuscation(
  code: string
): { type: string; confidence: number }

export function normalizeVariableNames(
  code: string
): string

// Legacy webpack helpers
export async function unpackWebpack(code: string): Promise<string[]>
export async function unpackGeneric(code: string): Promise<string[]>
```

## Quick Examples

### Basic Usage

```typescript
import { deobfuscate } from './deobfuscator/index.js';

const bundles = [{
  url: 'https://example.com/app.js',
  code: obfuscatedCode,
  bundlerType: 'webpack'
}];

const result = await deobfuscate(bundles);
console.log(`Cleaned ${result.filter(m => m.success).length} modules`);
```

### Custom Configuration

```typescript
import { cleanModule } from './deobfuscator/index.js';

const module = { id: 0, code: obfuscatedCode };

const customConfig = {
  arrays: { unpackArrays: true, removeArrays: true },
  proxyFunctions: { replaceProxyFunctions: true, removeProxyFunctions: true },
  expressions: { simplifyExpressions: true, removeDeadBranches: true, undoStringOperations: true },
  miscellaneous: { beautify: true, simplifyProperties: true, renameHexIdentifiers: true }
};

const cleaned = await cleanModule(module, customConfig);
```

### Obfuscation Analysis

```typescript
import { analyzeObfuscation } from './deobfuscator/index.js';

const analysis = analyzeObfuscation(code);
// { type: 'webpack' | 'javascript-obfuscator' | 'uglify' | ..., confidence: 0-1 }
```

## Default Configuration

```typescript
{
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
}
```

## Error Handling

```typescript
const result = await deobfuscate(bundles);

result.forEach(module => {
  if (module.success) {
    // Use cleaned code
    processCode(module.code);
  } else {
    // Handle errors
    console.error(`Module ${module.id} failed:`, module.errors);
    // Original code is still available
    console.log('Original:', module.original.code);
  }
});
```

## Common Patterns

### Process All Bundles

```typescript
const bundles = await scraper.extractBundles(url);
const cleanModules = await deobfuscate(bundles);
const components = await reconstructor.extractComponents(cleanModules);
```

### Filter Successful Modules

```typescript
const successfulModules = cleanModules.filter(m => m.success);
const failedModules = cleanModules.filter(m => !m.success);
```

### Custom Module Processing

```typescript
for (const bundle of bundles) {
  const modules = await unpackBundle(bundle.code, bundle.bundlerType);

  for (const module of modules) {
    const cleaned = await cleanModule(module);
    if (cleaned.success) {
      await saveModule(cleaned);
    }
  }
}
```

## File Locations

- **Main entry**: `/Users/bgf/site-cloner/src/deobfuscator/index.ts`
- **Types**: `/Users/bgf/site-cloner/src/types/index.ts`
- **Examples**: `/Users/bgf/site-cloner/src/deobfuscator/example.ts`
- **Tests**: `/Users/bgf/site-cloner/src/deobfuscator/test.ts`
- **Docs**: `/Users/bgf/site-cloner/src/deobfuscator/README.md`

## Troubleshooting

### Node Version Error

```
Error: Node.js 22 or higher is required for webcrack. Current version: v20.x.x
```

**Solution**: Upgrade to Node 22+

### Webcrack Fails

The module automatically falls back to manual extraction and returns original code as single module.

### All Modules Fail

Check the `errors` array in each `CleanModule` for specific error messages. The original code is preserved in `module.original.code`.

### Performance Issues

Process bundles in batches or use custom configuration with fewer transformations enabled.

## Links

- Full documentation: `src/deobfuscator/README.md`
- Implementation summary: `DEOBFUSCATOR_MODULE.md`
- Type definitions: `src/types/index.ts`
