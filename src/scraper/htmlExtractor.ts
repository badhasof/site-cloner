/**
 * Extract structured HTML content with computed styles from a page
 */

import { Page } from 'playwright';
import { URLMapper, rewriteAttributeURL, rewriteStyleAttribute } from '../utils/urlRewriter.js';

const SKIP_ELEMENTS = new Set([
  'next-route-announcer',
  'next-error',
  'portal',
  'slot',
]);

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
 * Note: Uses string evaluation to avoid tsx/esbuild __name helper issues
 */
async function extractStructuredContent(page: Page): Promise<ExtractedElement> {
  const extractScript = `
    (function() {
      function extractElement(element) {
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
          return null;
        }

        var styles = window.getComputedStyle(element);

        if (styles.display === 'none' || styles.visibility === 'hidden') {
          return null;
        }

        var computedStyles = {};
        var relevantProps = [
          'display', 'position', 'width', 'height', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
          'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
          'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
          'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily',
          'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
          'border', 'borderWidth', 'borderColor', 'borderRadius', 'borderStyle', 'boxShadow',
          'flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'flexGrow', 'flexShrink',
          'gridTemplateColumns', 'gridTemplateRows', 'gap',
          'top', 'right', 'bottom', 'left', 'zIndex',
          'opacity', 'overflow', 'overflowX', 'overflowY'
        ];

        for (var i = 0; i < relevantProps.length; i++) {
          var prop = relevantProps[i];
          var value = styles.getPropertyValue(prop) || styles[prop];
          if (value && value !== 'none' && value !== 'normal') {
            computedStyles[prop] = value;
          }
        }

        var attributes = {};
        for (var j = 0; j < element.attributes.length; j++) {
          var attr = element.attributes[j];
          if (!attr.name.startsWith('data-playwright-')) {
            attributes[attr.name] = attr.value;
          }
        }

        var textContent = '';
        var childNodes = element.childNodes;
        for (var k = 0; k < childNodes.length; k++) {
          var node = childNodes[k];
          if (node.nodeType === Node.TEXT_NODE) {
            var text = (node.textContent || '').trim();
            if (text) {
              textContent += text + ' ';
            }
          }
        }
        textContent = textContent.trim();

        var children = [];
        var elementChildren = element.children;
        for (var m = 0; m < elementChildren.length; m++) {
          var extracted = extractElement(elementChildren[m]);
          if (extracted) {
            children.push(extracted);
          }
        }

        return {
          tagName: element.tagName.toLowerCase(),
          textContent: textContent,
          attributes: attributes,
          computedStyles: computedStyles,
          children: children
        };
      }

      var body = document.body;
      if (!body) {
        return { tagName: 'div', textContent: '', attributes: {}, computedStyles: {}, children: [] };
      }

      return extractElement(body) || { tagName: 'div', textContent: '', attributes: {}, computedStyles: {}, children: [] };
    })()
  `;

  return await page.evaluate(extractScript);
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
          // Escape special characters in class names for CSS selectors
          const escapedClasses = classes.slice(0, 2).map(c =>
            c.replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/:/g, '\\:')
          );
          selector += '.' + escapedClasses.join('.');
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
        'maxWidth',
        'maxHeight',
        'minWidth',
        'minHeight',
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
        'letterSpacing',
        'textAlign',
        'textDecoration',
        'border',
        'borderWidth',
        'borderColor',
        'borderRadius',
        'borderStyle',
        'boxShadow',
        'flexDirection',
        'justifyContent',
        'alignItems',
        'flexWrap',
        'flexGrow',
        'flexShrink',
        'gridTemplateColumns',
        'gridTemplateRows',
        'gap',
        'top',
        'right',
        'bottom',
        'left',
        'zIndex',
        'opacity',
        'overflow',
        'overflowX',
        'overflowY'
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
export function elementToJSX(element: ExtractedElement, indent: number = 0, urlMapper?: URLMapper): string {
  const indentStr = '  '.repeat(indent);
  let { tagName, textContent, attributes, computedStyles, children } = element;

  // Skip known problematic elements entirely - render children only
  if (SKIP_ELEMENTS.has(tagName)) {
    // Return children JSX only, skip the wrapper element
    const childrenJsx = children
      .map(child => elementToJSX(child, indent, urlMapper))
      .filter(c => c)
      .join('\n');
    return childrenJsx;
  }

  // Convert custom elements (with hyphens) to div
  if (tagName.includes('-')) {
    tagName = 'div';
  }

  // Special handling for body tag - return only its children
  if (tagName === 'body') {
    if (children.length === 0) {
      return `${indentStr}<div />`;
    }
    if (children.length === 1) {
      return elementToJSX(children[0], indent, urlMapper);
    }
    // Multiple children - wrap in a Fragment to avoid JSX error
    const childrenJsx = children.map(child => elementToJSX(child, indent + 1, urlMapper)).join('\n');
    return `${indentStr}<>\n${childrenJsx}\n${indentStr}</>`;
  }

  // Build attributes string
  const attrs: string[] = [];

  // Collect Tailwind classes from computed styles
  const tailwindClasses = computedStylesToTailwind(computedStyles);

  // Track if we've already added className to avoid duplicates
  let classNameAdded = false;

  // Convert class to className and merge with Tailwind classes
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class' || key === 'className') {
      // Skip if we've already processed className
      if (classNameAdded) continue;

      // Merge existing classes with generated Tailwind classes
      const existingClasses = value.split(' ').filter(c => c.trim());
      const allClasses = [...new Set([...existingClasses, ...tailwindClasses])];
      if (allClasses.length > 0) {
        attrs.push(`className="${allClasses.join(' ')}"`);
        classNameAdded = true;
      }
    } else if (key === 'style') {
      // Rewrite URLs in inline styles if urlMapper is provided
      if (urlMapper) {
        const rewrittenStyle = rewriteStyleAttribute(value, urlMapper);
        if (rewrittenStyle && rewrittenStyle.trim()) {
          attrs.push(`style={{${convertStyleStringToJSX(rewrittenStyle)}}}`);
        }
      }
      // Otherwise skip inline styles, we'll use computed styles
      continue;
    } else if (key === 'href' || key === 'src' || key === 'srcset' || key === 'poster' || key === 'data') {
      // Rewrite URL attributes
      const rewrittenValue = urlMapper ? rewriteAttributeURL(key, value, urlMapper) : value;
      attrs.push(`${key}="${rewrittenValue}"`);
    } else if (key === 'alt' || key === 'title' || key === 'id') {
      // Keep important non-URL attributes
      attrs.push(`${key}="${value}"`);
    }
  }

  // If no class attribute but we have Tailwind classes, add them
  if (!classNameAdded && tailwindClasses.length > 0) {
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
      jsx += elementToJSX(child, indent + 1, urlMapper) + '\n';
    }
    jsx += indentStr;
  }

  // Add closing tag
  jsx += `</${tagName}>`;

  return jsx;
}

/**
 * Convert CSS style string to JSX style object notation
 */
function convertStyleStringToJSX(styleString: string): string {
  const styles = styleString.split(';')
    .filter(s => s.trim())
    .map(s => {
      const [prop, value] = s.split(':').map(p => p.trim());
      if (!prop || !value) return '';

      // Convert CSS property to camelCase
      const jsxProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      // Quote the value
      return `${jsxProp}: '${value.replace(/'/g, "\\'")}'`;
    })
    .filter(s => s);

  return styles.join(', ');
}

/**
 * Convert computed styles to Tailwind classes
 */
function computedStylesToTailwind(styles: Record<string, string>): string[] {
  const classes: string[] = [];

  // Get display and position values first - used for conditional checks
  const display = styles.display || '';
  const position = styles.position || 'static';
  const isFlex = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';
  const isPositioned = position !== 'static';

  // 1. COLORS
  if (styles.color) {
    const colorClass = colorToTailwind(styles.color, 'text');
    if (colorClass) classes.push(colorClass);
  }

  if (styles.backgroundColor) {
    const bgClass = colorToTailwind(styles.backgroundColor, 'bg');
    if (bgClass) classes.push(bgClass);
  }

  // 2. TYPOGRAPHY
  if (styles.fontSize) {
    const sizeClass = fontSizeToTailwind(styles.fontSize);
    if (sizeClass) classes.push(sizeClass);
  }

  if (styles.fontWeight) {
    const weight = parseInt(styles.fontWeight);
    if (weight >= 900) classes.push('font-black');
    else if (weight >= 800) classes.push('font-extrabold');
    else if (weight >= 700) classes.push('font-bold');
    else if (weight >= 600) classes.push('font-semibold');
    else if (weight >= 500) classes.push('font-medium');
    else if (weight >= 400) classes.push('font-normal');
    else if (weight >= 300) classes.push('font-light');
    else if (weight >= 200) classes.push('font-extralight');
    else if (weight >= 100) classes.push('font-thin');
  }

  if (styles.fontFamily) {
    const fontClass = fontFamilyToTailwind(styles.fontFamily);
    if (fontClass) classes.push(fontClass);
  }

  if (styles.lineHeight) {
    const lineHeightClass = lineHeightToTailwind(styles.lineHeight);
    if (lineHeightClass) classes.push(lineHeightClass);
  }

  if (styles.letterSpacing) {
    const letterSpacingClass = letterSpacingToTailwind(styles.letterSpacing);
    if (letterSpacingClass) classes.push(letterSpacingClass);
  }

  if (styles.textAlign) {
    const alignMap: Record<string, string> = {
      'left': 'text-left',
      'center': 'text-center',
      'right': 'text-right',
      'justify': 'text-justify',
      'start': 'text-start',
      'end': 'text-end'
    };
    if (alignMap[styles.textAlign]) {
      classes.push(alignMap[styles.textAlign]);
    }
  }

  if (styles.textDecoration && styles.textDecoration !== 'none') {
    if (styles.textDecoration.includes('underline')) classes.push('underline');
    else if (styles.textDecoration.includes('line-through')) classes.push('line-through');
  }

  // 3. DISPLAY
  if (display) {
    const displayMap: Record<string, string> = {
      'block': 'block',
      'inline-block': 'inline-block',
      'inline': 'inline',
      'flex': 'flex',
      'inline-flex': 'inline-flex',
      'grid': 'grid',
      'inline-grid': 'inline-grid',
      'hidden': 'hidden'
    };
    if (displayMap[display]) {
      classes.push(displayMap[display]);
    }
  }

  // 4. SIZING - Only use percentage-based or named values, skip fixed pixel widths/heights
  if (styles.width) {
    const widthClass = sizeToTailwind(styles.width, 'w', true);
    if (widthClass) classes.push(widthClass);
  }

  if (styles.height) {
    const heightClass = sizeToTailwind(styles.height, 'h', true);
    if (heightClass) classes.push(heightClass);
  }

  if (styles.maxWidth) {
    const maxWidthClass = sizeToTailwind(styles.maxWidth, 'max-w', false);
    if (maxWidthClass) classes.push(maxWidthClass);
  }

  if (styles.maxHeight) {
    const maxHeightClass = sizeToTailwind(styles.maxHeight, 'max-h', false);
    if (maxHeightClass) classes.push(maxHeightClass);
  }

  // Skip min-w-auto, min-h-auto, and min-w-0, min-h-0 (all are defaults/noise)
  if (styles.minWidth && styles.minWidth !== 'auto' && styles.minWidth !== '0px' && styles.minWidth !== '0') {
    const minWidthClass = sizeToTailwind(styles.minWidth, 'min-w', false);
    if (minWidthClass && minWidthClass !== 'min-w-0') classes.push(minWidthClass);
  }

  if (styles.minHeight && styles.minHeight !== 'auto' && styles.minHeight !== '0px' && styles.minHeight !== '0') {
    const minHeightClass = sizeToTailwind(styles.minHeight, 'min-h', false);
    if (minHeightClass && minHeightClass !== 'min-h-0') classes.push(minHeightClass);
  }

  // 5. SPACING - Margin
  if (styles.margin && styles.margin !== '0px' && styles.margin !== '0') {
    const marginClass = spacingToTailwind(styles.margin, 'm');
    if (marginClass) classes.push(marginClass);
  } else if (styles.margin === '0px' || styles.margin === '0') {
    classes.push('m-0');
  } else {
    if (styles.marginTop) {
      const mtClass = spacingToTailwind(styles.marginTop, 'mt');
      if (mtClass) classes.push(mtClass);
    }
    if (styles.marginRight) {
      const mrClass = spacingToTailwind(styles.marginRight, 'mr');
      if (mrClass) classes.push(mrClass);
    }
    if (styles.marginBottom) {
      const mbClass = spacingToTailwind(styles.marginBottom, 'mb');
      if (mbClass) classes.push(mbClass);
    }
    if (styles.marginLeft) {
      const mlClass = spacingToTailwind(styles.marginLeft, 'ml');
      if (mlClass) classes.push(mlClass);
    }
  }

  // Padding
  if (styles.padding && styles.padding !== '0px' && styles.padding !== '0') {
    const paddingClass = spacingToTailwind(styles.padding, 'p');
    if (paddingClass) classes.push(paddingClass);
  } else if (styles.padding === '0px' || styles.padding === '0') {
    classes.push('p-0');
  } else {
    if (styles.paddingTop) {
      const ptClass = spacingToTailwind(styles.paddingTop, 'pt');
      if (ptClass) classes.push(ptClass);
    }
    if (styles.paddingRight) {
      const prClass = spacingToTailwind(styles.paddingRight, 'pr');
      if (prClass) classes.push(prClass);
    }
    if (styles.paddingBottom) {
      const pbClass = spacingToTailwind(styles.paddingBottom, 'pb');
      if (pbClass) classes.push(pbClass);
    }
    if (styles.paddingLeft) {
      const plClass = spacingToTailwind(styles.paddingLeft, 'pl');
      if (plClass) classes.push(plClass);
    }
  }

  // Gap - only for flex/grid containers
  if ((isFlex || isGrid) && styles.gap) {
    const gapClass = spacingToTailwind(styles.gap, 'gap');
    if (gapClass) classes.push(gapClass);
  }

  // 6. BORDERS - Only add border classes if there's an actual border
  const hasBorder = styles.borderWidth && parseFloat(styles.borderWidth) > 0;

  if (hasBorder && styles.borderWidth) {
    const borderClass = borderWidthToTailwind(styles.borderWidth);
    if (borderClass) classes.push(borderClass);
  }

  if (hasBorder && styles.borderColor) {
    const borderColorClass = colorToTailwind(styles.borderColor, 'border');
    if (borderColorClass) classes.push(borderColorClass);
  }

  // Skip rounded-none (default)
  if (styles.borderRadius && parseFloat(styles.borderRadius) > 0) {
    const radiusClass = borderRadiusToTailwind(styles.borderRadius);
    if (radiusClass && radiusClass !== 'rounded-none') classes.push(radiusClass);
  }

  // Only add border-solid if there's an actual border
  if (hasBorder && styles.borderStyle && styles.borderStyle !== 'none') {
    const styleMap: Record<string, string> = {
      'solid': 'border-solid',
      'dashed': 'border-dashed',
      'dotted': 'border-dotted',
      'double': 'border-double'
    };
    if (styleMap[styles.borderStyle]) {
      classes.push(styleMap[styles.borderStyle]);
    }
  }

  // 7. SHADOWS
  if (styles.boxShadow && styles.boxShadow !== 'none') {
    const shadowClass = boxShadowToTailwind(styles.boxShadow);
    if (shadowClass) classes.push(shadowClass);
  }

  // 8. FLEXBOX - Only add flex properties when display is flex/inline-flex
  if (isFlex) {
    // Skip flex-row (default)
    if (styles.flexDirection && styles.flexDirection !== 'row') {
      const directionMap: Record<string, string> = {
        'row-reverse': 'flex-row-reverse',
        'column': 'flex-col',
        'column-reverse': 'flex-col-reverse'
      };
      if (directionMap[styles.flexDirection]) {
        classes.push(directionMap[styles.flexDirection]);
      }
    }

    if (styles.justifyContent) {
      const justifyMap: Record<string, string> = {
        'flex-start': 'justify-start',
        'flex-end': 'justify-end',
        'center': 'justify-center',
        'space-between': 'justify-between',
        'space-around': 'justify-around',
        'space-evenly': 'justify-evenly'
      };
      if (justifyMap[styles.justifyContent]) {
        classes.push(justifyMap[styles.justifyContent]);
      }
    }

    if (styles.alignItems) {
      const alignMap: Record<string, string> = {
        'flex-start': 'items-start',
        'flex-end': 'items-end',
        'center': 'items-center',
        'baseline': 'items-baseline',
        'stretch': 'items-stretch'
      };
      if (alignMap[styles.alignItems]) {
        classes.push(alignMap[styles.alignItems]);
      }
    }

    // Skip flex-nowrap (default)
    if (styles.flexWrap && styles.flexWrap !== 'nowrap') {
      const wrapMap: Record<string, string> = {
        'wrap': 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse'
      };
      if (wrapMap[styles.flexWrap]) {
        classes.push(wrapMap[styles.flexWrap]);
      }
    }

    if (styles.flexGrow) {
      const grow = parseInt(styles.flexGrow);
      // Only add if grow is 1 (skip flex-grow-0, it's default)
      if (grow === 1) classes.push('flex-grow');
    }

    if (styles.flexShrink) {
      const shrink = parseInt(styles.flexShrink);
      // Only add flex-shrink-0 if explicitly 0 (1 is default)
      if (shrink === 0) classes.push('flex-shrink-0');
    }
  }

  // 9. GRID - Only add grid properties when display is grid/inline-grid
  if (isGrid) {
    if (styles.gridTemplateColumns) {
      const gridColsClass = gridTemplateToTailwind(styles.gridTemplateColumns, 'grid-cols');
      if (gridColsClass) classes.push(gridColsClass);
    }

    if (styles.gridTemplateRows) {
      const gridRowsClass = gridTemplateToTailwind(styles.gridTemplateRows, 'grid-rows');
      if (gridRowsClass) classes.push(gridRowsClass);
    }
  }

  // 10. POSITIONING
  // Skip static (default)
  if (position && position !== 'static') {
    const positionMap: Record<string, string> = {
      'relative': 'relative',
      'absolute': 'absolute',
      'fixed': 'fixed',
      'sticky': 'sticky'
    };
    if (positionMap[position]) {
      classes.push(positionMap[position]);
    }
  }

  // Only add position offsets for absolute, fixed, sticky - NOT relative
  // For relative positioning, offsets of 0 are visually meaningless
  const shouldAddOffsets = position && ['absolute', 'fixed', 'sticky'].includes(position);

  if (shouldAddOffsets) {
    // Check if all four offsets are 0 - use inset-0 instead
    const top = styles.top;
    const right = styles.right;
    const bottom = styles.bottom;
    const left = styles.left;

    const isZero = (val: string | undefined) => val === '0px' || val === '0' || val === '0%';

    if (isZero(top) && isZero(right) && isZero(bottom) && isZero(left)) {
      classes.push('inset-0');
    } else {
      // Add individual offsets, skip auto and 0 (0 is often default)
      if (top && top !== 'auto' && !isZero(top)) {
        const topClass = positionOffsetToTailwind(top, 'top');
        if (topClass) classes.push(topClass);
      }
      if (right && right !== 'auto' && !isZero(right)) {
        const rightClass = positionOffsetToTailwind(right, 'right');
        if (rightClass) classes.push(rightClass);
      }
      if (bottom && bottom !== 'auto' && !isZero(bottom)) {
        const bottomClass = positionOffsetToTailwind(bottom, 'bottom');
        if (bottomClass) classes.push(bottomClass);
      }
      if (left && left !== 'auto' && !isZero(left)) {
        const leftClass = positionOffsetToTailwind(left, 'left');
        if (leftClass) classes.push(leftClass);
      }
    }
  }

  // Skip z-[auto]
  if (styles.zIndex && styles.zIndex !== 'auto') {
    const zClass = zIndexToTailwind(styles.zIndex);
    if (zClass && zClass !== 'z-auto') classes.push(zClass);
  }

  // 11. OPACITY
  if (styles.opacity && styles.opacity !== '1') {
    const opacityClass = opacityToTailwind(styles.opacity);
    if (opacityClass) classes.push(opacityClass);
  }

  // 12. OVERFLOW - Skip visible (default)
  if (styles.overflow && styles.overflow !== 'visible') {
    const overflowMap: Record<string, string> = {
      'auto': 'overflow-auto',
      'hidden': 'overflow-hidden',
      'scroll': 'overflow-scroll'
    };
    if (overflowMap[styles.overflow]) {
      classes.push(overflowMap[styles.overflow]);
    }
  }

  if (styles.overflowX && styles.overflowX !== 'visible') {
    const overflowXMap: Record<string, string> = {
      'auto': 'overflow-x-auto',
      'hidden': 'overflow-x-hidden',
      'scroll': 'overflow-x-scroll'
    };
    if (overflowXMap[styles.overflowX]) {
      classes.push(overflowXMap[styles.overflowX]);
    }
  }

  if (styles.overflowY && styles.overflowY !== 'visible') {
    const overflowYMap: Record<string, string> = {
      'auto': 'overflow-y-auto',
      'hidden': 'overflow-y-hidden',
      'scroll': 'overflow-y-scroll'
    };
    if (overflowYMap[styles.overflowY]) {
      classes.push(overflowYMap[styles.overflowY]);
    }
  }

  return classes;
}

/**
 * Convert color values (rgb, rgba, hex) to Tailwind color classes
 */
function colorToTailwind(color: string, prefix: 'text' | 'bg' | 'border'): string | null {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return null;
  }

  const colorMap: Record<string, string> = {
    'rgb(255, 255, 255)': 'white', 'rgb(0, 0, 0)': 'black',
    'rgba(255, 255, 255, 1)': 'white', 'rgba(0, 0, 0, 1)': 'black',
    '#ffffff': 'white', '#fff': 'white', '#000000': 'black', '#000': 'black',
    'rgb(248, 250, 252)': 'slate-50', 'rgb(241, 245, 249)': 'slate-100',
    'rgb(226, 232, 240)': 'slate-200', 'rgb(203, 213, 225)': 'slate-300',
    'rgb(148, 163, 184)': 'slate-400', 'rgb(100, 116, 139)': 'slate-500',
    'rgb(71, 85, 105)': 'slate-600', 'rgb(51, 65, 85)': 'slate-700',
    'rgb(30, 41, 59)': 'slate-800', 'rgb(15, 23, 42)': 'slate-900',
    'rgb(239, 246, 255)': 'blue-50', 'rgb(219, 234, 254)': 'blue-100',
    'rgb(191, 219, 254)': 'blue-200', 'rgb(147, 197, 253)': 'blue-300',
    'rgb(96, 165, 250)': 'blue-400', 'rgb(59, 130, 246)': 'blue-500',
    'rgb(37, 99, 235)': 'blue-600', 'rgb(29, 78, 216)': 'blue-700',
    'rgb(30, 64, 175)': 'blue-800', 'rgb(30, 58, 138)': 'blue-900',
    'rgb(254, 242, 242)': 'red-50', 'rgb(254, 226, 226)': 'red-100',
    'rgb(254, 202, 202)': 'red-200', 'rgb(252, 165, 165)': 'red-300',
    'rgb(248, 113, 113)': 'red-400', 'rgb(239, 68, 68)': 'red-500',
    'rgb(220, 38, 38)': 'red-600', 'rgb(185, 28, 28)': 'red-700',
    'rgb(153, 27, 27)': 'red-800', 'rgb(127, 29, 29)': 'red-900',
    'rgb(240, 253, 244)': 'green-50', 'rgb(220, 252, 231)': 'green-100',
    'rgb(187, 247, 208)': 'green-200', 'rgb(134, 239, 172)': 'green-300',
    'rgb(74, 222, 128)': 'green-400', 'rgb(34, 197, 94)': 'green-500',
    'rgb(22, 163, 74)': 'green-600', 'rgb(21, 128, 61)': 'green-700',
    'rgb(22, 101, 52)': 'green-800', 'rgb(20, 83, 45)': 'green-900',
  };

  const normalized = color.toLowerCase().replace(/\s/g, '');
  if (colorMap[normalized]) {
    return `${prefix}-${colorMap[normalized]}`;
  }

  return `${prefix}-[${color.replace(/\s/g, '')}]`;
}

function fontSizeToTailwind(fontSize: string): string | null {
  const size = parseFloat(fontSize);
  if (size <= 12) return 'text-xs';
  if (size <= 14) return 'text-sm';
  if (size <= 16) return 'text-base';
  if (size <= 18) return 'text-lg';
  if (size <= 20) return 'text-xl';
  if (size <= 24) return 'text-2xl';
  if (size <= 30) return 'text-3xl';
  if (size <= 36) return 'text-4xl';
  if (size <= 48) return 'text-5xl';
  if (size <= 60) return 'text-6xl';
  if (size <= 72) return 'text-7xl';
  if (size <= 96) return 'text-8xl';
  if (size > 96) return 'text-9xl';
  return `text-[${fontSize}]`;
}

function fontFamilyToTailwind(fontFamily: string): string | null {
  const family = fontFamily.toLowerCase();
  if (family.includes('monospace') || family.includes('courier') || family.includes('monaco')) return 'font-mono';
  if (family.includes('serif') || family.includes('georgia') || family.includes('times')) return 'font-serif';
  if (family.includes('sans') || family.includes('arial') || family.includes('helvetica')) return 'font-sans';
  return null;
}

function lineHeightToTailwind(lineHeight: string): string | null {
  const value = parseFloat(lineHeight);
  if (lineHeight.includes('px')) return `leading-[${lineHeight}]`;
  if (value <= 1) return 'leading-none';
  if (value <= 1.25) return 'leading-tight';
  if (value <= 1.375) return 'leading-snug';
  if (value <= 1.5) return 'leading-normal';
  if (value <= 1.625) return 'leading-relaxed';
  if (value <= 2) return 'leading-loose';
  return `leading-[${lineHeight}]`;
}

function letterSpacingToTailwind(letterSpacing: string): string | null {
  const value = parseFloat(letterSpacing);
  if (value < -0.05) return 'tracking-tighter';
  if (value < -0.025) return 'tracking-tight';
  if (value === 0) return 'tracking-normal';
  if (value <= 0.025) return 'tracking-wide';
  if (value <= 0.05) return 'tracking-wider';
  if (value > 0.05) return 'tracking-widest';
  return `tracking-[${letterSpacing}]`;
}

function sizeToTailwind(size: string, prefix: string, skipLargePixels: boolean = false): string | null {
  if (!size || size === 'auto') return null; // Don't generate w-auto or h-auto

  if (size.includes('%')) {
    const percent = parseFloat(size);
    if (percent === 100) return `${prefix}-full`;
    if (percent === 50) return `${prefix}-1/2`;
    if (percent === 33.333 || percent === 33.33) return `${prefix}-1/3`;
    if (percent === 66.666 || percent === 66.67) return `${prefix}-2/3`;
    if (percent === 25) return `${prefix}-1/4`;
    if (percent === 75) return `${prefix}-3/4`;
    return `${prefix}-[${size}]`;
  }

  if (size.includes('px')) {
    const px = parseFloat(size);
    if (px === 0) return `${prefix}-0`;
    if (px === 1) return `${prefix}-px`;

    // For width/height, skip large pixel values to maintain responsive design
    if (skipLargePixels && px > 384) {
      return null;
    }

    const scale = Math.round(px / 4);
    if (scale >= 0 && scale <= 96) return `${prefix}-${scale}`;
    if (prefix === 'max-w') {
      if (px <= 384) return 'max-w-sm';
      if (px <= 448) return 'max-w-md';
      if (px <= 512) return 'max-w-lg';
      if (px <= 576) return 'max-w-xl';
      if (px <= 672) return 'max-w-2xl';
      if (px <= 768) return 'max-w-3xl';
      if (px <= 896) return 'max-w-4xl';
      if (px <= 1024) return 'max-w-5xl';
      if (px <= 1152) return 'max-w-6xl';
      if (px <= 1280) return 'max-w-7xl';
    }
    return `${prefix}-[${size}]`;
  }

  if (size.includes('rem') || size.includes('em')) return `${prefix}-[${size}]`;
  if (size.includes('vw') || size.includes('vh')) {
    const value = parseFloat(size);
    if (value === 100) return `${prefix}-screen`;
    return `${prefix}-[${size}]`;
  }
  return null;
}

function spacingToTailwind(spacing: string, prefix: string): string | null {
  if (!spacing || spacing === 'auto') {
    return prefix === 'm' || prefix.startsWith('m') ? `${prefix}-auto` : null;
  }
  if (spacing === '0px' || spacing === '0') return `${prefix}-0`;

  if (spacing.includes('px')) {
    const px = parseFloat(spacing);
    if (px === 1) return `${prefix}-px`;
    const scale = Math.round(px / 4);
    if (scale >= 0 && scale <= 96) return `${prefix}-${scale}`;
    return `${prefix}-[${spacing}]`;
  }

  if (spacing.includes('rem') || spacing.includes('em')) {
    const rem = parseFloat(spacing);
    const scale = Math.round(rem * 4);
    if (scale >= 0 && scale <= 96) return `${prefix}-${scale}`;
    return `${prefix}-[${spacing}]`;
  }
  return null;
}

function borderWidthToTailwind(borderWidth: string): string | null {
  const width = parseFloat(borderWidth);
  if (width === 0) return null; // Don't generate border-0
  if (width === 1) return 'border';
  if (width === 2) return 'border-2';
  if (width === 4) return 'border-4';
  if (width === 8) return 'border-8';
  return `border-[${borderWidth}]`;
}

function borderRadiusToTailwind(borderRadius: string): string | null {
  const radius = parseFloat(borderRadius);
  if (radius === 0) return null; // Don't generate rounded-none (it's the default)
  if (radius <= 2) return 'rounded-sm';
  if (radius <= 4) return 'rounded';
  if (radius <= 6) return 'rounded-md';
  if (radius <= 8) return 'rounded-lg';
  if (radius <= 12) return 'rounded-xl';
  if (radius <= 16) return 'rounded-2xl';
  if (radius <= 24) return 'rounded-3xl';
  if (radius >= 9999 || borderRadius === '50%') return 'rounded-full';
  return `rounded-[${borderRadius}]`;
}

function boxShadowToTailwind(boxShadow: string): string | null {
  if (!boxShadow || boxShadow === 'none') return null;
  const shadow = boxShadow.toLowerCase();
  if (shadow.includes('rgba(0, 0, 0, 0)')) return null;
  if (shadow.includes('0px 1px') || shadow.includes('0 1px')) return 'shadow-sm';
  if (shadow.includes('0px 4px') || shadow.includes('0 4px')) return 'shadow';
  if (shadow.includes('0px 10px') || shadow.includes('0 10px')) return 'shadow-md';
  if (shadow.includes('0px 15px') || shadow.includes('0 15px')) return 'shadow-lg';
  if (shadow.includes('0px 20px') || shadow.includes('0 20px')) return 'shadow-xl';
  if (shadow.includes('0px 25px') || shadow.includes('0 25px')) return 'shadow-2xl';
  if (shadow.includes('inset')) return 'shadow-inner';
  return `shadow-[${boxShadow}]`;
}

function gridTemplateToTailwind(gridTemplate: string, prefix: string): string | null {
  const parts = gridTemplate.split(' ').filter(p => p && p !== 'none');
  if (parts.length >= 1 && parts.length <= 12) return `${prefix}-${parts.length}`;
  const repeatMatch = gridTemplate.match(/repeat\((\d+),/);
  if (repeatMatch) {
    const count = parseInt(repeatMatch[1]);
    if (count >= 1 && count <= 12) return `${prefix}-${count}`;
  }
  return `${prefix}-[${gridTemplate}]`;
}

function positionOffsetToTailwind(offset: string, prefix: string): string | null {
  if (!offset || offset === 'auto') return null; // Don't generate top-auto, right-auto, etc.
  if (offset === '0px' || offset === '0') return `${prefix}-0`;

  if (offset.includes('%')) {
    const percent = parseFloat(offset);
    if (percent === 0) return `${prefix}-0`;
    if (percent === 50) return `${prefix}-1/2`;
    if (percent === 100) return `${prefix}-full`;
    return `${prefix}-[${offset}]`;
  }

  if (offset.includes('px')) {
    const px = parseFloat(offset);
    const scale = Math.round(px / 4);
    if (scale >= 0 && scale <= 96) return `${prefix}-${scale}`;
    return `${prefix}-[${offset}]`;
  }
  return `${prefix}-[${offset}]`;
}

function zIndexToTailwind(zIndex: string): string | null {
  if (zIndex === 'auto') return null; // Don't generate z-auto
  const z = parseInt(zIndex);
  if (isNaN(z)) return null;
  if (z === 0) return 'z-0';
  if (z === 10) return 'z-10';
  if (z === 20) return 'z-20';
  if (z === 30) return 'z-30';
  if (z === 40) return 'z-40';
  if (z === 50) return 'z-50';
  if (z === 999 || z === 1000) return 'z-50';
  if (z < 0) return null; // Negative z-index is unusual, skip it
  return `z-[${zIndex}]`;
}

function opacityToTailwind(opacity: string): string | null {
  const value = parseFloat(opacity);
  if (value === 0) return 'opacity-0';
  if (value <= 0.05) return 'opacity-5';
  if (value <= 0.10) return 'opacity-10';
  if (value <= 0.20) return 'opacity-20';
  if (value <= 0.25) return 'opacity-25';
  if (value <= 0.30) return 'opacity-30';
  if (value <= 0.40) return 'opacity-40';
  if (value <= 0.50) return 'opacity-50';
  if (value <= 0.60) return 'opacity-60';
  if (value <= 0.70) return 'opacity-70';
  if (value <= 0.75) return 'opacity-75';
  if (value <= 0.80) return 'opacity-80';
  if (value <= 0.90) return 'opacity-90';
  if (value <= 0.95) return 'opacity-95';
  if (value < 1) return 'opacity-100';
  return null;
}
