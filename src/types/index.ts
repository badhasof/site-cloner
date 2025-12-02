/**
 * Type definitions for the site-cloner project
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
 * A detected React component
 */
export interface DetectedComponent {
  /** Component name */
  name: string;
  /** Component source code (JSX) */
  code: string;
  /** Component type */
  type: 'function' | 'class' | 'arrow' | 'forwardRef' | 'memo';
  /** Props type definition if detectable */
  propsType?: string;
  /** Hooks used in the component */
  hooks: HookUsage[];
  /** Dependencies (imports, other components used) */
  dependencies: string[];
  /** Whether this component is exported */
  isExported: boolean;
  /** Original module id this component came from */
  moduleId: string | number;
  /** Location in source code */
  location?: {
    start: number;
    end: number;
  };
}

/**
 * Hook usage within a component
 */
export interface HookUsage {
  /** Hook name (useState, useEffect, etc.) */
  name: string;
  /** Hook type */
  type: 'state' | 'effect' | 'ref' | 'memo' | 'callback' | 'context' | 'reducer' | 'custom';
  /** Arguments passed to the hook if analyzable */
  args?: string[];
  /** Line number where hook is used */
  line?: number;
}

/**
 * Extracted custom hook definition
 */
export interface HookDefinition {
  /** Hook name */
  name: string;
  /** Hook source code */
  code: string;
  /** Hooks this custom hook depends on */
  dependencies: string[];
  /** Parameters the hook accepts */
  parameters: string[];
  /** Return type if detectable */
  returnType?: string;
  /** Whether this hook is exported */
  isExported: boolean;
}

/**
 * Result of hook extraction
 */
export interface HookExtractionResult {
  /** Extracted custom hooks */
  hooks: HookDefinition[];
  /** Original code with hooks removed/cleaned */
  cleanedCode: string;
}

/**
 * JSX conversion options
 */
export interface JSXConversionOptions {
  /** Use React.Fragment or <> for fragments */
  useFragmentShorthand?: boolean;
  /** Preserve comments in output */
  preserveComments?: boolean;
  /** Format output with prettier */
  format?: boolean;
  /** Custom prettier options */
  prettierOptions?: any;
}

/**
 * Component splitting options
 */
export interface ComponentSplittingOptions {
  /** Minimum lines for a component to be extracted */
  minLines?: number;
  /** Whether to extract inline components */
  extractInlineComponents?: boolean;
  /** Name anonymous components based on usage */
  nameAnonymousComponents?: boolean;
}

/**
 * Reconstructor configuration
 */
export interface ReconstructorConfig {
  /** JSX conversion options */
  jsxOptions?: JSXConversionOptions;
  /** Component splitting options */
  componentOptions?: ComponentSplittingOptions;
  /** Whether to extract hooks into separate files */
  extractHooks?: boolean;
  /** Whether to format output code */
  formatOutput?: boolean;
}

/**
 * Scraper-specific types
 */

/** Asset types */
export interface Asset {
  url: string;
  type: 'image' | 'font' | 'video' | 'svg' | 'icon' | 'other';
  localPath?: string;      // Absolute path to downloaded file in temp dir
  relativePath?: string;   // Relative path for URL rewriting (e.g., "images/logo.png")
  size?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
}

/** Extracted CSS/styles */
export interface ExtractedStyles {
  url: string;
  content: string;
  type: 'inline' | 'external' | 'computed';
  mediaQuery?: string;
}

/** Scraper options */
export interface ScrapeOptions {
  timeout?: number;
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

/** Extracted HTML with structure and styles */
export interface ExtractedHTML {
  bodyHtml: string;
  structuredContent: ExtractedElement;
  computedStylesMap: Map<string, Record<string, string>>;
}

/** Extracted element structure */
export interface ExtractedElement {
  tagName: string;
  textContent: string;
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  children: ExtractedElement[];
}

/** Scraper result */
export interface ScrapeResult {
  url: string;
  html: string;
  bundles: ExtractedBundle[];
  styles: ExtractedStyles[];
  assets: Asset[];
  metadata: {
    timestamp: Date;
    duration: number;
    title: string;
  };
  extractedHTML?: ExtractedHTML;
}

/**
 * Main cloneSite API types
 */

/** Options for cloneSite function */
export interface CloneOptions {
  /** Output directory */
  output?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Include animations */
  includeAnimations?: boolean;
  /** Include assets */
  includeAssets?: boolean;
  /** Page load timeout */
  timeout?: number;
  /** Run browser in headless mode */
  headless?: boolean;
}

/** Result from cloneSite function */
export interface CloneResult {
  /** Output directory path */
  outputDir: string;
  /** Number of components extracted */
  components: number;
  /** Number of assets downloaded */
  assets: number;
  /** Success flag */
  success: boolean;
  /** Error messages */
  errors: string[];
}

/** Processed styles after Tailwind conversion */
export interface ProcessedStyles {
  /** Map of selectors to Tailwind classes */
  classMap: Map<string, any[]>;
  /** Array of all Tailwind classes */
  tailwindClasses: string[];
  /** Custom CSS (not convertible to Tailwind) */
  customCSS: string;
  /** CSS variables */
  cssVariables: Record<string, string>;
  /** Class mappings with confidence scores */
  mappings: Array<{ originalClass: string; tailwindClasses: string[]; confidence: number }>;
  /** Tailwind config */
  config: any;
  /** Animations */
  animations: any[];

  // Deprecated fields for backwards compatibility
  /** @deprecated Use customCSS instead */
  tailwindCss?: string;
  /** @deprecated Use customCSS instead */
  customCss?: string;
  /** @deprecated Use config instead */
  tailwindConfig?: Record<string, any>;
}

/** Animation result from animation capturer */
export interface AnimationResult {
  /** Captured animations */
  animations: CapturedAnimation[];
  /** Generated Framer Motion code */
  framerMotionCode: string;
  /** CSS animations */
  cssAnimations: any[];
  /** Scroll animations */
  scrollAnimations: any[];
}

/** Captured animation */
export interface CapturedAnimation {
  /** Animation ID */
  id: string;
  /** Animation name */
  name?: string;
  /** Animation type */
  type: string;
  /** Target selector */
  selector: string;
  /** Keyframes */
  keyframes: any[];
  /** Timing information */
  timing: any;
  /** Trigger information */
  trigger?: any;
  /** Element information */
  element?: any;
}

// Re-export animation types (if exists)
// export * from './animations.js';
