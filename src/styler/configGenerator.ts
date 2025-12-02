/**
 * Tailwind Config Generator Module
 * Generates tailwind.config.js content from parsed CSS
 */

import {
  ParsedCSS,
  TailwindConfig,
  ParsedKeyframe,
  FontFace,
  CustomProperty,
} from './types.js';

/**
 * Extract unique colors from CSS declarations
 */
function extractColors(parsedCSS: ParsedCSS): Record<string, string> {
  const colors: Record<string, string> = {};

  parsedCSS.rules.forEach(rule => {
    rule.declarations.forEach(decl => {
      const property = decl.property.toLowerCase();

      // Check for color properties
      if (
        property === 'color' ||
        property === 'background-color' ||
        property === 'border-color' ||
        property.includes('color')
      ) {
        const value = decl.value.toLowerCase();

        // Only extract hex, rgb, rgba, hsl, hsla colors
        if (
          value.startsWith('#') ||
          value.startsWith('rgb') ||
          value.startsWith('hsl')
        ) {
          // Generate a color name
          const colorName = generateColorName(value);
          colors[colorName] = value;
        }
      }
    });
  });

  // Extract colors from custom properties
  parsedCSS.customProperties.forEach(prop => {
    const value = prop.value.toLowerCase();
    if (
      value.startsWith('#') ||
      value.startsWith('rgb') ||
      value.startsWith('hsl')
    ) {
      // Use the custom property name (without --)
      const colorName = prop.name.slice(2).replace(/-/g, '_');
      colors[colorName] = value;
    }
  });

  return colors;
}

/**
 * Generate a color name from a color value
 */
function generateColorName(color: string): string {
  // For hex colors
  if (color.startsWith('#')) {
    return `color_${color.slice(1)}`;
  }

  // For rgb/rgba colors
  if (color.startsWith('rgb')) {
    const values = color.match(/\d+/g);
    if (values && values.length >= 3) {
      return `rgb_${values[0]}_${values[1]}_${values[2]}`;
    }
  }

  // For hsl/hsla colors
  if (color.startsWith('hsl')) {
    const values = color.match(/\d+/g);
    if (values && values.length >= 3) {
      return `hsl_${values[0]}_${values[1]}_${values[2]}`;
    }
  }

  return `color_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Extract font families from font-face rules and font-family declarations
 */
function extractFontFamilies(parsedCSS: ParsedCSS): Record<string, string[]> {
  const fontFamilies: Record<string, string[]> = {};

  // Extract from @font-face rules
  parsedCSS.fontFaces.forEach((fontFace: FontFace) => {
    const familyName = fontFace.fontFamily.replace(/['"]/g, '');
    const key = familyName.toLowerCase().replace(/\s+/g, '-');

    if (!fontFamilies[key]) {
      fontFamilies[key] = [familyName];
    }
  });

  // Extract from font-family declarations
  parsedCSS.rules.forEach(rule => {
    rule.declarations.forEach(decl => {
      if (decl.property === 'font-family') {
        const families = decl.value
          .split(',')
          .map(f => f.trim().replace(/['"]/g, ''));

        families.forEach(family => {
          const key = family.toLowerCase().replace(/\s+/g, '-');
          if (!fontFamilies[key] && !isGenericFontFamily(family)) {
            fontFamilies[key] = [family];
          }
        });
      }
    });
  });

  return fontFamilies;
}

/**
 * Check if a font family is a generic CSS font family
 */
function isGenericFontFamily(family: string): boolean {
  const genericFamilies = [
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
  ];
  return genericFamilies.includes(family.toLowerCase());
}

/**
 * Extract custom spacing values from CSS
 */
function extractSpacing(parsedCSS: ParsedCSS): Record<string, string> {
  const spacing: Record<string, string> = {};
  const spacingProperties = [
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'gap',
  ];

  parsedCSS.rules.forEach(rule => {
    rule.declarations.forEach(decl => {
      if (spacingProperties.includes(decl.property)) {
        const value = decl.value;

        // Only extract custom spacing values (not standard Tailwind values)
        if (
          value.endsWith('px') ||
          value.endsWith('rem') ||
          value.endsWith('em')
        ) {
          const numValue = parseFloat(value);

          // Skip standard Tailwind spacing values
          const standardValues = [
            0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48,
            56, 64, 80, 96, 112, 128,
          ];

          if (value.endsWith('px') && !standardValues.includes(numValue)) {
            const key = `spacing_${numValue}`;
            spacing[key] = value;
          }
        }
      }
    });
  });

  return spacing;
}

/**
 * Extract custom border-radius values
 */
function extractBorderRadius(parsedCSS: ParsedCSS): Record<string, string> {
  const borderRadius: Record<string, string> = {};

  parsedCSS.rules.forEach(rule => {
    rule.declarations.forEach(decl => {
      if (decl.property.includes('border-radius')) {
        const value = decl.value;

        // Skip standard Tailwind values
        const standardValues = [
          '0', '0px', '2px', '4px', '6px', '8px', '12px', '16px', '24px',
          '9999px', '50%',
        ];

        if (!standardValues.includes(value)) {
          const key = `radius_${value.replace(/[^a-z0-9]/gi, '_')}`;
          borderRadius[key] = value;
        }
      }
    });
  });

  return borderRadius;
}

/**
 * Extract box-shadow values
 */
function extractBoxShadows(parsedCSS: ParsedCSS): Record<string, string> {
  const boxShadows: Record<string, string> = {};

  parsedCSS.rules.forEach(rule => {
    rule.declarations.forEach(decl => {
      if (decl.property === 'box-shadow') {
        const value = decl.value;

        // Skip 'none'
        if (value !== 'none') {
          const key = `shadow_${Object.keys(boxShadows).length + 1}`;
          boxShadows[key] = value;
        }
      }
    });
  });

  return boxShadows;
}

/**
 * Convert ParsedKeyframe to Tailwind keyframes format
 */
function convertKeyframesToTailwindFormat(
  keyframes: ParsedKeyframe[]
): Record<string, Record<string, Record<string, string>>> {
  const tailwindKeyframes: Record<
    string,
    Record<string, Record<string, string>>
  > = {};

  keyframes.forEach(keyframe => {
    const steps: Record<string, Record<string, string>> = {};

    keyframe.steps.forEach(step => {
      const properties: Record<string, string> = {};

      step.declarations.forEach(decl => {
        properties[decl.property] = decl.value;
      });

      steps[step.offset] = properties;
    });

    tailwindKeyframes[keyframe.name] = steps;
  });

  return tailwindKeyframes;
}

/**
 * Generate animation utilities from keyframes
 */
function generateAnimations(
  parsedCSS: ParsedCSS
): Record<string, string> {
  const animations: Record<string, string> = {};

  parsedCSS.keyframes.forEach(keyframe => {
    // Look for animation declarations that use this keyframe
    parsedCSS.rules.forEach(rule => {
      rule.declarations.forEach(decl => {
        if (
          decl.property === 'animation' ||
          decl.property === 'animation-name'
        ) {
          if (decl.value.includes(keyframe.name)) {
            // Extract animation properties
            let duration = '1s';
            let timingFunction = 'ease';
            let iterationCount = '1';

            rule.declarations.forEach(d => {
              if (d.property === 'animation-duration') duration = d.value;
              if (d.property === 'animation-timing-function')
                timingFunction = d.value;
              if (d.property === 'animation-iteration-count')
                iterationCount = d.value;
            });

            // Full animation shorthand
            if (decl.property === 'animation') {
              const parts = decl.value.split(/\s+/);
              if (parts.length >= 1) {
                duration = parts.find(p => p.match(/\d+m?s/)) || duration;
                timingFunction =
                  parts.find(p =>
                    ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(
                      p
                    )
                  ) || timingFunction;
                iterationCount =
                  parts.find(p => p === 'infinite' || p.match(/^\d+$/)) ||
                  iterationCount;
              }
            }

            animations[
              keyframe.name
            ] = `${keyframe.name} ${duration} ${timingFunction} ${iterationCount}`;
          }
        }
      });
    });

    // If no animation declaration found, create a default one
    if (!animations[keyframe.name]) {
      animations[keyframe.name] = `${keyframe.name} 1s ease`;
    }
  });

  return animations;
}

/**
 * Main function to generate Tailwind config
 */
export function generateTailwindConfig(parsedCSS: ParsedCSS): TailwindConfig {
  const colors = extractColors(parsedCSS);
  const fontFamilies = extractFontFamilies(parsedCSS);
  const spacing = extractSpacing(parsedCSS);
  const borderRadius = extractBorderRadius(parsedCSS);
  const boxShadows = extractBoxShadows(parsedCSS);
  const keyframes = convertKeyframesToTailwindFormat(parsedCSS.keyframes);
  const animations = generateAnimations(parsedCSS);

  const config: TailwindConfig = {
    theme: {
      extend: {},
    },
    plugins: [],
    safelist: [],
  };

  // Add extracted values to theme.extend
  if (Object.keys(colors).length > 0) {
    config.theme.extend.colors = colors;
  }

  if (Object.keys(fontFamilies).length > 0) {
    config.theme.extend.fontFamily = fontFamilies;
  }

  if (Object.keys(spacing).length > 0) {
    config.theme.extend.spacing = spacing;
  }

  if (Object.keys(borderRadius).length > 0) {
    config.theme.extend.borderRadius = borderRadius;
  }

  if (Object.keys(boxShadows).length > 0) {
    config.theme.extend.boxShadow = boxShadows;
  }

  if (Object.keys(keyframes).length > 0) {
    config.theme.extend.keyframes = keyframes;
  }

  if (Object.keys(animations).length > 0) {
    config.theme.extend.animation = animations;
  }

  return config;
}

/**
 * Convert TailwindConfig to JavaScript string for tailwind.config.js
 */
export function configToString(config: TailwindConfig): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = ${JSON.stringify(config, null, 2)};
`;
}

/**
 * Generate a complete tailwind.config.js file content
 */
export function generateConfigFile(parsedCSS: ParsedCSS): string {
  const config = generateTailwindConfig(parsedCSS);
  return configToString(config);
}
