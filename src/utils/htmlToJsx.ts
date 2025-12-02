/**
 * Utility to convert HTML to JSX
 * Handles attribute name conversions, self-closing tags, and inline styles
 */

interface ConversionOptions {
  /** Whether to convert inline styles to style objects */
  convertInlineStyles?: boolean;
  /** Whether to try mapping styles to Tailwind classes */
  useTailwind?: boolean;
  /** Preserve data attributes */
  preserveDataAttributes?: boolean;
}

/**
 * Convert HTML string to JSX string
 */
export function htmlToJsx(html: string, options: ConversionOptions = {}): string {
  const {
    convertInlineStyles = true,
    useTailwind = false,
    preserveDataAttributes = true
  } = options;

  let jsx = html;

  // Remove comments
  jsx = jsx.replace(/<!--[\s\S]*?-->/g, '');

  // Convert class to className
  jsx = jsx.replace(/\sclass=/g, ' className=');

  // Convert for to htmlFor
  jsx = jsx.replace(/\sfor=/g, ' htmlFor=');

  // Convert inline styles from string to object notation
  if (convertInlineStyles) {
    jsx = jsx.replace(/style="([^"]*)"/g, (match, styleString) => {
      const styleObj = parseInlineStyle(styleString);
      if (Object.keys(styleObj).length === 0) {
        return '';
      }
      const styleObjectString = JSON.stringify(styleObj);
      return `style={${styleObjectString}}`;
    });
  }

  // Convert boolean attributes
  jsx = convertBooleanAttributes(jsx);

  // Convert self-closing tags
  jsx = convertSelfClosingTags(jsx);

  // Remove doctype if present
  jsx = jsx.replace(/<!DOCTYPE[^>]*>/i, '');

  // Clean up extra whitespace but preserve structure
  jsx = jsx.replace(/\n\s*\n/g, '\n');

  return jsx.trim();
}

/**
 * Parse inline style string to React style object
 */
function parseInlineStyle(styleString: string): Record<string, string> {
  const styleObj: Record<string, string> = {};

  if (!styleString.trim()) {
    return styleObj;
  }

  const declarations = styleString.split(';').filter(s => s.trim());

  for (const declaration of declarations) {
    const [property, ...valueParts] = declaration.split(':');
    if (!property || valueParts.length === 0) {
      continue;
    }

    const value = valueParts.join(':').trim();
    const camelCaseProp = cssPropToCamelCase(property.trim());

    styleObj[camelCaseProp] = value;
  }

  return styleObj;
}

/**
 * Convert CSS property name to camelCase for React
 */
function cssPropToCamelCase(prop: string): string {
  // Handle vendor prefixes
  if (prop.startsWith('-webkit-')) {
    prop = 'webkit' + prop.slice(7);
  } else if (prop.startsWith('-moz-')) {
    prop = 'moz' + prop.slice(4);
  } else if (prop.startsWith('-ms-')) {
    prop = 'ms' + prop.slice(3);
  } else if (prop.startsWith('-o-')) {
    prop = 'o' + prop.slice(2);
  }

  return prop.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert boolean attributes to JSX format
 */
function convertBooleanAttributes(html: string): string {
  const booleanAttrs = [
    'checked',
    'selected',
    'disabled',
    'readonly',
    'required',
    'autofocus',
    'autoplay',
    'controls',
    'loop',
    'muted',
    'multiple',
    'open'
  ];

  let result = html;

  for (const attr of booleanAttrs) {
    // Convert standalone boolean attributes to {true}
    result = result.replace(
      new RegExp(`\\s${attr}(?=[\\s/>])`, 'gi'),
      ` ${attr}={true}`
    );
  }

  return result;
}

/**
 * Convert self-closing tags to proper JSX format
 */
function convertSelfClosingTags(html: string): string {
  const selfClosingTags = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ];

  let result = html;

  for (const tag of selfClosingTags) {
    // Convert <tag> to <tag />
    result = result.replace(
      new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi'),
      `<${tag}$1 />`
    );
  }

  return result;
}

/**
 * Extract the body content from HTML and convert to JSX
 */
export function extractBodyToJsx(html: string, options: ConversionOptions = {}): string {
  // Try to extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html;

  return htmlToJsx(content, options);
}

/**
 * Compute Tailwind classes from computed styles
 * This is a simplified mapping - real implementation would be more comprehensive
 */
export function stylesToTailwind(styles: Record<string, string>): string[] {
  const classes: string[] = [];

  // Text styles
  if (styles.textAlign) {
    const alignMap: Record<string, string> = {
      'left': 'text-left',
      'center': 'text-center',
      'right': 'text-right',
      'justify': 'text-justify'
    };
    if (alignMap[styles.textAlign]) {
      classes.push(alignMap[styles.textAlign]);
    }
  }

  if (styles.fontWeight) {
    const weight = parseInt(styles.fontWeight);
    if (weight >= 700) classes.push('font-bold');
    else if (weight >= 600) classes.push('font-semibold');
    else if (weight >= 500) classes.push('font-medium');
    else if (weight <= 300) classes.push('font-light');
  }

  // Display
  if (styles.display) {
    const displayMap: Record<string, string> = {
      'block': 'block',
      'inline-block': 'inline-block',
      'inline': 'inline',
      'flex': 'flex',
      'grid': 'grid',
      'none': 'hidden'
    };
    if (displayMap[styles.display]) {
      classes.push(displayMap[styles.display]);
    }
  }

  // Spacing (simplified)
  if (styles.margin) {
    const margin = styles.margin;
    if (margin === '0px' || margin === '0') classes.push('m-0');
    else if (margin === 'auto') classes.push('m-auto');
  }

  if (styles.padding) {
    const padding = styles.padding;
    if (padding === '0px' || padding === '0') classes.push('p-0');
  }

  return classes;
}

/**
 * Wrap JSX content in a React component structure
 */
export function wrapInComponent(jsx: string, componentName: string = 'App'): string {
  return `import React from 'react';

function ${componentName}() {
  return (
    ${indentJsx(jsx, 2)}
  );
}

export default ${componentName};
`;
}

/**
 * Indent JSX content
 */
function indentJsx(jsx: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return jsx.split('\n').map(line => indent + line).join('\n');
}
