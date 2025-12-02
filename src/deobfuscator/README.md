# Deobfuscator Module

A powerful deobfuscation pipeline that chains multiple tools to clean bundled and minified JavaScript code.

## Overview

This module provides a complete pipeline for unpacking and deobfuscating JavaScript bundles:

1. **Unpacking** (via webcrack): Extracts individual modules from bundled code
2. **Cleaning** (via js-deobfuscator): Deobfuscates and beautifies each module

## Requirements

- Node.js 22+ (required by webcrack)

## Usage

```typescript
import { deobfuscate } from './deobfuscator/index.js';
import type { ExtractedBundle } from './deobfuscator/types.js';

// Define bundles to deobfuscate
const bundles: ExtractedBundle[] = [
  {
    url: 'https://example.com/bundle.js',
    code: '... minified code ...',
    bundlerType: 'webpack',
    filename: 'bundle.js'
  }
];

// Run the deobfuscation pipeline
const cleanModules = await deobfuscate(bundles);

// Access cleaned modules
cleanModules.forEach(module => {
  if (module.success) {
    console.log(`Module ${module.id}:`);
    console.log(module.code);
  } else {
    console.error(`Failed to clean module ${module.id}:`, module.errors);
  }
});
```

## API

### `deobfuscate(bundles: ExtractedBundle[]): Promise<CleanModule[]>`

Main entry point for the deobfuscation pipeline.

**Parameters:**
- `bundles`: Array of extracted bundles to process

**Returns:**
- Promise resolving to array of cleaned modules

### `unpackBundle(code: string, bundlerType?: string): Promise<Module[]>`

Unpacks a bundle into individual modules using webcrack.

**Parameters:**
- `code`: Bundled/minified JavaScript code
- `bundlerType`: Optional bundler type hint ('webpack', 'rollup', etc.)

**Returns:**
- Promise resolving to array of extracted modules

**Features:**
- Automatic bundle detection via webcrack
- Manual fallback for webpack IIFE patterns
- Handles both object-based and array-based module formats

### `cleanModule(mod: Module, config?: DeobfuscatorConfig): Promise<CleanModule>`

Cleans and deobfuscates a single module.

**Parameters:**
- `mod`: Module to clean
- `config`: Optional custom deobfuscator configuration

**Returns:**
- Promise resolving to cleaned module

**Features:**
- Array unpacking and removal
- Proxy function replacement
- Expression simplification
- Dead branch removal
- String operation undoing
- Code beautification
- Hex identifier renaming
- Graceful error handling with fallback to simple beautification

### `cleanModules(modules: Module[], config?: DeobfuscatorConfig): Promise<CleanModule[]>`

Cleans multiple modules in parallel.

**Parameters:**
- `modules`: Array of modules to clean
- `config`: Optional custom deobfuscator configuration

**Returns:**
- Promise resolving to array of cleaned modules

## Types

### `ExtractedBundle`

```typescript
interface ExtractedBundle {
  url: string;           // Source URL of the bundle
  code: string;          // Raw bundled/minified code
  bundlerType?: string;  // Detected bundler type
  filename?: string;     // Original filename if available
}
```

### `Module`

```typescript
interface Module {
  id: string | number;   // Module identifier
  code: string;          // Module source code
  dependencies?: string[];
  sourceBundle?: string;
}
```

### `CleanModule`

```typescript
interface CleanModule {
  id: string | number;   // Module identifier
  code: string;          // Cleaned and deobfuscated code
  original: Module;      // Original module before cleaning
  success: boolean;      // Whether deobfuscation was successful
  errors?: string[];     // Any errors encountered
  sourceBundle?: string;
}
```

### `DeobfuscatorConfig`

```typescript
interface DeobfuscatorConfig {
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
```

## Error Handling

The module is designed to be resilient:

- If webcrack fails, falls back to manual webpack pattern extraction
- If manual extraction fails, treats entire code as single module
- If full deobfuscation fails, attempts simple beautification
- If a module fails, continues processing other modules
- All errors are logged and returned in the `CleanModule.errors` array

## Logging

The module provides detailed console logging for each step:

```
[deobfuscator] Starting deobfuscation pipeline for 2 bundles...
[deobfuscator] Processing bundle 1/2: bundle.js
[deobfuscator] Step 1: Unpacking bundle...
[unpacker] Attempting to unpack bundle (type: webpack)...
[unpacker] Webcrack detected bundle, extracting modules...
[unpacker] Found 42 modules in bundle
[deobfuscator] Extracted 42 modules from bundle
[deobfuscator] Step 2: Cleaning modules...
[cleaner] Cleaning 42 modules...
[cleaner] Successfully cleaned module 0
[cleaner] Successfully cleaned module 1
...
[cleaner] Successfully cleaned 40/42 modules
[deobfuscator] Completed bundle 1/2: 40/42 modules cleaned successfully
[deobfuscator] Pipeline complete: 80/84 modules cleaned successfully
```

## Architecture

```
deobfuscate() → Pipeline orchestration
    ↓
    ├── unpackBundle() → Extract modules from bundles
    │       ↓
    │       ├── webcrack → Primary unpacking
    │       └── Manual extraction → Fallback for webpack patterns
    │
    └── cleanModules() → Clean each module
            ↓
            └── cleanModule() → Deobfuscate individual module
                    ↓
                    ├── js-deobfuscator (full config) → Primary cleaning
                    └── js-deobfuscator (simple config) → Fallback beautification
```

## Dependencies

- **webcrack** (^2.14.1): Bundle unpacking and initial deobfuscation
- **js-deobfuscator** (^1.5.0): Advanced deobfuscation transformations
