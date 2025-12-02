/**
 * Generator Module Exports
 *
 * This file provides all public exports from the generator module.
 * Use this for importing generator functionality in other parts of the application.
 */

// Main API
export {
  generateProject,
  validateOutputDirectory,
  isDirectoryEmpty,
} from './index.js';

// Package Builder
export {
  generatePackageJson,
} from './packageBuilder.js';

// Vite Scaffold
export {
  createViteProject,
} from './viteScaffold.js';

// Component Writer
export {
  writeComponents,
  writeUtilities,
  writeHooks,
  generateUtilityClass,
} from './componentWriter.js';

// Asset Downloader
export {
  downloadAsset,
  downloadAllAssets,
  normalizeAssetPath,
  optimizeImage,
  getImageDimensions,
} from './assetDownloader.js';

// Template Copier
export {
  copyTemplateDirectory,
  copyTemplateFile,
  templateExists,
} from './templateCopier.js';

// Code Formatter
export {
  formatTypeScript,
  formatJSX,
  addComponentHeader,
  formatComponentExport,
  wrapInFragment,
  ensureNewlineAtEnd,
  type FormatOptions,
} from './codeFormatter.js';

// Examples (for reference)
export {
  exampleUsage,
  exampleEcommerce,
  exampleBlog,
} from './example.js';

// Types are exported from src/types.ts
// Import them separately:
// import { DetectedComponent, ProcessedStyles, ... } from '../types';
