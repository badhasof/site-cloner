/**
 * Types for the deobfuscator module
 */

/**
 * Extracted bundle from a website
 */
export interface ExtractedBundle {
  /** Source URL of the bundle */
  url: string;
  /** Raw bundled/minified code */
  code: string;
  /** Detected bundler type (webpack, rollup, etc.) */
  bundlerType?: string;
  /** Original filename if available */
  filename?: string;
}

/**
 * A single module extracted from a bundle
 */
export interface Module {
  /** Module identifier (webpack module id, file path, etc.) */
  id: string | number;
  /** Module source code */
  code: string;
  /** Dependencies referenced in the module */
  dependencies?: string[];
  /** Original bundle URL */
  sourceBundle?: string;
}

/**
 * A cleaned/deobfuscated module
 */
export interface CleanModule {
  /** Module identifier */
  id: string | number;
  /** Cleaned and deobfuscated code */
  code: string;
  /** Original module before cleaning */
  original: Module;
  /** Whether deobfuscation was successful */
  success: boolean;
  /** Any errors encountered during cleaning */
  errors?: string[];
  /** Original bundle URL */
  sourceBundle?: string;
}

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
