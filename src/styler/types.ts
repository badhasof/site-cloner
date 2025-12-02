/**
 * Type definitions specific to the styler module
 */

export interface ParsedCSS {
  rules: ParsedCSSRule[];
  keyframes: ParsedKeyframe[];
  fontFaces: FontFace[];
  customProperties: CustomProperty[];
  mediaQueries: MediaQuery[];
}

export interface ParsedCSSRule {
  selector: string;
  declarations: CSSDeclaration[];
  pseudoClass?: string; // hover, focus, active, etc.
  mediaQuery?: string;
  specificity?: number;
}

export interface CSSDeclaration {
  property: string;
  value: string;
  important: boolean;
}

export interface ParsedKeyframe {
  name: string;
  steps: KeyframeStep[];
}

export interface KeyframeStep {
  offset: string; // "0%", "50%", "100%", "from", "to"
  declarations: CSSDeclaration[];
}

export interface FontFace {
  fontFamily: string;
  src: string[];
  fontWeight?: string;
  fontStyle?: string;
  fontDisplay?: string;
}

export interface CustomProperty {
  name: string; // --primary-color
  value: string;
  scope?: string; // :root, .class, etc.
}

export interface MediaQuery {
  query: string;
  rules: ParsedCSSRule[];
}

export interface TailwindClass {
  className: string;
  variant?: string; // hover, focus, md, lg, etc.
  important?: boolean;
}

export interface TailwindConfig {
  theme: {
    extend: {
      colors?: Record<string, string | Record<string, string>>;
      fontFamily?: Record<string, string[]>;
      fontSize?: Record<string, [string, { lineHeight: string }]>;
      spacing?: Record<string, string>;
      borderRadius?: Record<string, string>;
      boxShadow?: Record<string, string>;
      animation?: Record<string, string>;
      keyframes?: Record<string, Record<string, Record<string, string>>>;
      [key: string]: any;
    };
  };
  plugins?: string[];
  safelist?: string[];
}

export interface AnimationDefinition {
  name: string;
  keyframes: string;
  duration?: string;
  timingFunction?: string;
  iterationCount?: string;
}

export interface StyleProcessingOptions {
  preserveCustomProperties?: boolean;
  generateArbitraryValues?: boolean;
  minifyOutput?: boolean;
  includeComments?: boolean;
}
