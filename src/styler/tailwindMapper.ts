/**
 * Tailwind Mapper Module
 * Converts CSS properties to Tailwind utility classes
 */

import { TailwindConverter } from 'css-to-tailwindcss';

// Initialize the converter
const converter = new TailwindConverter({
  remInPx: 16,
  postCSSPlugins: [],
  tailwindConfig: {
    content: [],
  },
});

/**
 * Convert pixel values to Tailwind spacing scale
 */
function pxToTailwindSpacing(px: string): string {
  const value = parseFloat(px);

  const spacingMap: Record<number, string> = {
    0: '0', 1: '0.5', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5',
    12: '3', 14: '3.5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8',
    36: '9', 40: '10', 44: '11', 48: '12', 56: '14', 64: '16',
    80: '20', 96: '24', 112: '28', 128: '32', 144: '36', 160: '40',
    176: '44', 192: '48', 208: '52', 224: '56', 240: '60', 256: '64',
  };

  return spacingMap[value] || `[${px}]`;
}

/**
 * Map CSS display values to Tailwind
 */
function mapDisplay(value: string): string[] {
  const displayMap: Record<string, string> = {
    block: 'block', 'inline-block': 'inline-block', inline: 'inline',
    flex: 'flex', 'inline-flex': 'inline-flex', grid: 'grid',
    'inline-grid': 'inline-grid', table: 'table', hidden: 'hidden', none: 'hidden',
  };
  return displayMap[value] ? [displayMap[value]] : [`[display:${value}]`];
}

/**
 * Map CSS position values to Tailwind
 */
function mapPosition(value: string): string[] {
  const positionMap: Record<string, string> = {
    static: 'static', fixed: 'fixed', absolute: 'absolute',
    relative: 'relative', sticky: 'sticky',
  };
  return positionMap[value] ? [positionMap[value]] : [];
}

/**
 * Map spacing properties (margin, padding) to Tailwind
 */
function mapSpacing(property: string, value: string): string[] {
  const prefixMap: Record<string, string> = {
    margin: 'm', 'margin-top': 'mt', 'margin-right': 'mr',
    'margin-bottom': 'mb', 'margin-left': 'ml',
    padding: 'p', 'padding-top': 'pt', 'padding-right': 'pr',
    'padding-bottom': 'pb', 'padding-left': 'pl',
  };

  const prefix = prefixMap[property];
  if (!prefix) return [];

  if (value === 'auto') return [`${prefix}-auto`];
  if (value === '0' || value === '0px') return [`${prefix}-0`];

  if (value.endsWith('px')) {
    const spacing = pxToTailwindSpacing(value);
    return [`${prefix}-${spacing}`];
  }

  if (value.endsWith('rem')) {
    const px = parseFloat(value) * 16;
    const spacing = pxToTailwindSpacing(`${px}px`);
    return [`${prefix}-${spacing}`];
  }

  return [`${prefix}-[${value}]`];
}

/**
 * Map width/height properties to Tailwind
 */
function mapSize(property: string, value: string): string[] {
  const prefixMap: Record<string, string> = {
    width: 'w', height: 'h', 'min-width': 'min-w',
    'max-width': 'max-w', 'min-height': 'min-h', 'max-height': 'max-h',
  };

  const prefix = prefixMap[property];
  if (!prefix) return [];

  if (value === 'auto') return [`${prefix}-auto`];
  if (value === '100%') return [`${prefix}-full`];
  if (value === '100vw' || value === '100vh') return [`${prefix}-screen`];

  if (value.endsWith('%')) {
    const percent = parseFloat(value);
    const percentMap: Record<number, string> = {
      25: '1/4', 33.333333: '1/3', 50: '1/2', 66.666667: '2/3', 75: '3/4', 100: 'full',
    };
    if (percentMap[percent]) return [`${prefix}-${percentMap[percent]}`];
  }

  if (value.endsWith('px')) {
    const spacing = pxToTailwindSpacing(value);
    return [`${prefix}-${spacing}`];
  }

  return [`${prefix}-[${value}]`];
}

/**
 * Map font-size to Tailwind
 */
function mapFontSize(value: string): string[] {
  const fontSizeMap: Record<string, string> = {
    '12px': 'text-xs', '14px': 'text-sm', '16px': 'text-base',
    '18px': 'text-lg', '20px': 'text-xl', '24px': 'text-2xl',
    '30px': 'text-3xl', '36px': 'text-4xl', '48px': 'text-5xl',
  };
  return fontSizeMap[value] ? [fontSizeMap[value]] : [`text-[${value}]`];
}

/**
 * Map font-weight to Tailwind
 */
function mapFontWeight(value: string): string[] {
  const fontWeightMap: Record<string, string> = {
    '100': 'font-thin', '200': 'font-extralight', '300': 'font-light',
    '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold',
    '700': 'font-bold', '800': 'font-extrabold', '900': 'font-black',
    normal: 'font-normal', bold: 'font-bold',
  };
  return fontWeightMap[value] ? [fontWeightMap[value]] : [`font-[${value}]`];
}

/**
 * Map a CSS property-value pair to Tailwind classes
 */
function mapPropertyToTailwind(property: string, value: string): string[] {
  property = property.toLowerCase().trim();
  value = value.toLowerCase().trim();

  switch (property) {
    case 'display': return mapDisplay(value);
    case 'position': return mapPosition(value);
    case 'margin': case 'margin-top': case 'margin-right':
    case 'margin-bottom': case 'margin-left':
    case 'padding': case 'padding-top': case 'padding-right':
    case 'padding-bottom': case 'padding-left':
      return mapSpacing(property, value);
    case 'width': case 'height': case 'min-width':
    case 'max-width': case 'min-height': case 'max-height':
      return mapSize(property, value);
    case 'font-size': return mapFontSize(value);
    case 'font-weight': return mapFontWeight(value);
    default:
      return [`[${property}:${value}]`];
  }
}

/**
 * Main function to map CSS properties object to Tailwind classes
 */
export function mapToTailwind(
  cssProperties: Record<string, string>,
  pseudoClass?: string
): string {
  const tailwindClasses: string[] = [];

  Object.entries(cssProperties).forEach(([property, value]) => {
    const classes = mapPropertyToTailwind(property, value);

    if (pseudoClass) {
      classes.forEach(cls => {
        tailwindClasses.push(`${pseudoClass}:${cls}`);
      });
    } else {
      tailwindClasses.push(...classes);
    }
  });

  return Array.from(new Set(tailwindClasses)).join(' ');
}

/**
 * Convert full CSS rule to Tailwind classes using css-to-tailwindcss
 */
export async function convertCSSToTailwind(css: string): Promise<string> {
  try {
    const result = await converter.convertCSS(css);
    // convertedRoot is a Document or Root object from PostCSS, convert to string
    if (result.convertedRoot && typeof result.convertedRoot === 'object') {
      return result.convertedRoot.toString();
    }
    return '';
  } catch (error) {
    console.error('Error converting CSS to Tailwind:', error);
    return '';
  }
}
