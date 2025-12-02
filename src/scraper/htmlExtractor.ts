/**
 * Extract structured HTML content with computed styles from a page
 */

import { Page } from 'playwright';

export interface ExtractedElement {
  tagName: string;
  textContent: string;
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  children: ExtractedElement[];
}

export interface ExtractedHTML {
  bodyHtml: string;
  structuredContent: ExtractedElement;
  computedStylesMap: Map<string, Record<string, string>>;
}

/**
 * Extract the HTML body content with computed styles
 */
export async function extractHTMLContent(page: Page): Promise<ExtractedHTML> {
  // Get the raw HTML of the body
  const bodyHtml = await page.evaluate(() => {
    return document.body ? document.body.outerHTML : '';
  });

  // Get structured content with computed styles
  const structuredContent = await extractStructuredContent(page);

  // Get computed styles for all elements
  const computedStylesMap = await extractComputedStylesMap(page);

  return {
    bodyHtml,
    structuredContent,
    computedStylesMap
  };
}

/**
 * Extract structured content from the page with hierarchy
 */
async function extractStructuredContent(page: Page): Promise<ExtractedElement> {
  return await page.evaluate(() => {
    function extractElement(element: Element): any {
      // Skip script, style, noscript elements
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
        return null;
      }

      const styles = window.getComputedStyle(element);

      // Skip hidden elements
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        return null;
      }

      // Extract relevant computed styles
      const computedStyles: Record<string, string> = {};
      const relevantProps = [
        'display',
        'position',
        'width',
        'height',
        'margin',
        'padding',
        'color',
        'backgroundColor',
        'fontSize',
        'fontWeight',
        'fontFamily',
        'lineHeight',
        'textAlign',
        'textDecoration',
        'border',
        'borderRadius',
        'boxShadow'
      ];

      for (const prop of relevantProps) {
        const value = styles.getPropertyValue(prop) || (styles as any)[prop];
        if (value && value !== 'none' && value !== 'normal') {
          computedStyles[prop] = value;
        }
      }

      // Extract attributes
      const attributes: Record<string, string> = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        // Skip internal attributes
        if (!attr.name.startsWith('data-playwright-')) {
          attributes[attr.name] = attr.value;
        }
      }

      // Get text content (only direct text, not from children)
      let textContent = '';
      for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim() || '';
          if (text) {
            textContent += text + ' ';
          }
        }
      }
      textContent = textContent.trim();

      // Recursively extract children
      const children: any[] = [];
      for (const child of Array.from(element.children)) {
        const extracted = extractElement(child);
        if (extracted) {
          children.push(extracted);
        }
      }

      return {
        tagName: element.tagName.toLowerCase(),
        textContent,
        attributes,
        computedStyles,
        children
      };
    }

    const body = document.body;
    if (!body) {
      return {
        tagName: 'div',
        textContent: '',
        attributes: {},
        computedStyles: {},
        children: []
      };
    }

    return extractElement(body) || {
      tagName: 'div',
      textContent: '',
      attributes: {},
      computedStyles: {},
      children: []
    };
  });
}

/**
 * Extract a map of selector to computed styles for all elements
 */
async function extractComputedStylesMap(page: Page): Promise<Map<string, Record<string, string>>> {
  const stylesArray = await page.evaluate(() => {
    const results: Array<{ selector: string; styles: Record<string, string> }> = [];

    // Get all elements with IDs or classes
    const elements = document.querySelectorAll('[id], [class]');

    elements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);

      // Skip hidden elements
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        return;
      }

      // Create a selector
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += `#${element.id}`;
      } else if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      } else {
        selector += `-${index}`;
      }

      // Extract relevant styles
      const computedStyles: Record<string, string> = {};
      const relevantProps = [
        'display',
        'position',
        'width',
        'height',
        'margin',
        'marginTop',
        'marginRight',
        'marginBottom',
        'marginLeft',
        'padding',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'color',
        'backgroundColor',
        'fontSize',
        'fontWeight',
        'fontFamily',
        'lineHeight',
        'textAlign',
        'textDecoration',
        'border',
        'borderRadius',
        'boxShadow',
        'flexDirection',
        'justifyContent',
        'alignItems',
        'gap'
      ];

      for (const prop of relevantProps) {
        const value = styles.getPropertyValue(prop) || (styles as any)[prop];
        if (value && value !== 'none' && value !== 'normal' && value !== 'rgba(0, 0, 0, 0)') {
          computedStyles[prop] = value;
        }
      }

      if (Object.keys(computedStyles).length > 0) {
        results.push({ selector, styles: computedStyles });
      }
    });

    return results;
  });

  const map = new Map<string, Record<string, string>>();
  for (const item of stylesArray) {
    map.set(item.selector, item.styles);
  }

  return map;
}

/**
 * Convert extracted element to JSX with Tailwind classes
 */
export function elementToJSX(element: ExtractedElement, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  const { tagName, textContent, attributes, computedStyles, children } = element;

  // Special handling for body tag - return only its children
  if (tagName === 'body') {
    if (children.length === 0) {
      return `${indentStr}<div />`;
    }
    if (children.length === 1) {
      return elementToJSX(children[0], indent);
    }
    // Multiple children - wrap in fragment or first div
    return children.map(child => elementToJSX(child, indent)).join('\n');
  }

  // Build attributes string
  const attrs: string[] = [];

  // Collect Tailwind classes from computed styles
  const tailwindClasses = computedStylesToTailwind(computedStyles);

  // Convert class to className and merge with Tailwind classes
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') {
      // Merge existing classes with generated Tailwind classes
      const existingClasses = value.split(' ').filter(c => c.trim());
      const allClasses = [...new Set([...existingClasses, ...tailwindClasses])];
      if (allClasses.length > 0) {
        attrs.push(`className="${allClasses.join(' ')}"`);
      }
    } else if (key === 'style') {
      // Skip inline styles, we'll use computed styles
      continue;
    } else if (key === 'href' || key === 'src' || key === 'alt' || key === 'title' || key === 'id') {
      // Keep important attributes
      attrs.push(`${key}="${value}"`);
    }
  }

  // If no class attribute but we have Tailwind classes, add them
  if (!attributes.class && tailwindClasses.length > 0) {
    attrs.push(`className="${tailwindClasses.join(' ')}"`);
  }

  const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  // Handle self-closing tags
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
  if (selfClosingTags.includes(tagName)) {
    return `${indentStr}<${tagName}${attrsStr} />`;
  }

  // Build opening tag
  let jsx = `${indentStr}<${tagName}${attrsStr}>`;

  // Add text content
  if (textContent && children.length === 0) {
    jsx += textContent;
  } else if (textContent) {
    jsx += `\n${indentStr}  ${textContent}`;
  }

  // Add children
  if (children.length > 0) {
    jsx += '\n';
    for (const child of children) {
      jsx += elementToJSX(child, indent + 1) + '\n';
    }
    jsx += indentStr;
  }

  // Add closing tag
  jsx += `</${tagName}>`;

  return jsx;
}

/**
 * Convert computed styles to Tailwind classes
 */
function computedStylesToTailwind(styles: Record<string, string>): string[] {
  const classes: string[] = [];

  // Text alignment
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

  // Font weight
  if (styles.fontWeight) {
    const weight = parseInt(styles.fontWeight);
    if (weight >= 700) classes.push('font-bold');
    else if (weight >= 600) classes.push('font-semibold');
    else if (weight >= 500) classes.push('font-medium');
  }

  // Display
  if (styles.display) {
    const displayMap: Record<string, string> = {
      'block': 'block',
      'flex': 'flex',
      'inline-flex': 'inline-flex',
      'grid': 'grid',
      'inline-block': 'inline-block'
    };
    if (displayMap[styles.display]) {
      classes.push(displayMap[styles.display]);
    }
  }

  // Margins and padding (simplified - only handle common cases)
  if (styles.margin === '0px' || styles.margin === '0') {
    classes.push('m-0');
  }
  if (styles.padding === '0px' || styles.padding === '0') {
    classes.push('p-0');
  }

  return classes;
}
