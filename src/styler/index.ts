/**
 * Styler Module - Main Orchestration
 * Converts extracted CSS to Tailwind utility classes
 */

import { parseCSS, mergeParsedCSS } from './cssParser.js';
import { mapToTailwind, convertCSSToTailwind } from './tailwindMapper.js';
import { generateTailwindConfig, generateConfigFile } from './configGenerator.js';
import {
  ParsedCSS,
  TailwindClass,
  TailwindConfig,
  AnimationDefinition,
  StyleProcessingOptions,
} from './types.js';
import { ExtractedStyles, ProcessedStyles } from '../types/index.js';

/**
 * Convert CSS declarations to a properties object
 */
function declarationsToProperties(
  declarations: Array<{ property: string; value: string }>
): Record<string, string> {
  const properties: Record<string, string> = {};

  declarations.forEach(decl => {
    properties[decl.property] = decl.value;
  });

  return properties;
}

/**
 * Convert parsed keyframes to animation definitions
 */
function convertKeyframesToAnimations(
  parsedCSS: ParsedCSS
): AnimationDefinition[] {
  const animations: AnimationDefinition[] = [];

  parsedCSS.keyframes.forEach(keyframe => {
    const keyframesCSS = generateKeyframesCSS(keyframe.name, keyframe.steps);

    let duration: string | undefined;
    let timingFunction: string | undefined;
    let iterationCount: string | undefined;

    parsedCSS.rules.forEach(rule => {
      rule.declarations.forEach(decl => {
        if (
          (decl.property === 'animation' ||
            decl.property === 'animation-name') &&
          decl.value.includes(keyframe.name)
        ) {
          rule.declarations.forEach(d => {
            if (d.property === 'animation-duration') duration = d.value;
            if (d.property === 'animation-timing-function')
              timingFunction = d.value;
            if (d.property === 'animation-iteration-count')
              iterationCount = d.value;
          });

          if (decl.property === 'animation') {
            const parts = decl.value.split(/\s+/);
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
      });
    });

    animations.push({
      name: keyframe.name,
      keyframes: keyframesCSS,
      duration,
      timingFunction,
      iterationCount,
    });
  });

  return animations;
}

/**
 * Generate CSS for keyframes
 */
function generateKeyframesCSS(
  name: string,
  steps: Array<{
    offset: string;
    declarations: Array<{ property: string; value: string }>;
  }>
): string {
  let css = `@keyframes ${name} {\n`;

  steps.forEach(step => {
    css += `  ${step.offset} {\n`;
    step.declarations.forEach(decl => {
      css += `    ${decl.property}: ${decl.value};\n`;
    });
    css += `  }\n`;
  });

  css += `}`;
  return css;
}

/**
 * Generate custom CSS for rules that couldn't be converted to Tailwind
 */
function generateCustomCSS(parsedCSS: ParsedCSS): string {
  let customCSS = '';

  // Add font-face rules
  if (parsedCSS.fontFaces.length > 0) {
    parsedCSS.fontFaces.forEach(fontFace => {
      customCSS += `@font-face {\n`;
      customCSS += `  font-family: '${fontFace.fontFamily}';\n`;
      fontFace.src.forEach(src => {
        customCSS += `  src: ${src};\n`;
      });
      if (fontFace.fontWeight) {
        customCSS += `  font-weight: ${fontFace.fontWeight};\n`;
      }
      if (fontFace.fontStyle) {
        customCSS += `  font-style: ${fontFace.fontStyle};\n`;
      }
      if (fontFace.fontDisplay) {
        customCSS += `  font-display: ${fontFace.fontDisplay};\n`;
      }
      customCSS += `}\n\n`;
    });
  }

  // Add custom properties (CSS variables)
  if (parsedCSS.customProperties.length > 0) {
    const rootProperties = parsedCSS.customProperties.filter(
      prop => prop.scope === ':root' || !prop.scope
    );

    if (rootProperties.length > 0) {
      customCSS += `:root {\n`;
      rootProperties.forEach(prop => {
        customCSS += `  ${prop.name}: ${prop.value};\n`;
      });
      customCSS += `}\n\n`;
    }

    const scopedProperties = parsedCSS.customProperties.filter(
      prop => prop.scope && prop.scope !== ':root'
    );

    const propertiesByScope = new Map<string, typeof scopedProperties>();
    scopedProperties.forEach(prop => {
      const scope = prop.scope!;
      if (!propertiesByScope.has(scope)) {
        propertiesByScope.set(scope, []);
      }
      propertiesByScope.get(scope)!.push(prop);
    });

    propertiesByScope.forEach((props, scope) => {
      customCSS += `${scope} {\n`;
      props.forEach(prop => {
        customCSS += `  ${prop.name}: ${prop.value};\n`;
      });
      customCSS += `}\n\n`;
    });
  }

  // Add keyframes
  parsedCSS.keyframes.forEach(keyframe => {
    customCSS += generateKeyframesCSS(keyframe.name, keyframe.steps);
    customCSS += '\n\n';
  });

  return customCSS.trim();
}

/**
 * Map responsive breakpoint from media query
 */
function mapMediaQueryToBreakpoint(query: string): string | undefined {
  const breakpoints: Record<string, RegExp> = {
    sm: /min-width:\s*640px/,
    md: /min-width:\s*768px/,
    lg: /min-width:\s*1024px/,
    xl: /min-width:\s*1280px/,
    '2xl': /min-width:\s*1536px/,
  };

  for (const [name, pattern] of Object.entries(breakpoints)) {
    if (pattern.test(query)) {
      return name;
    }
  }

  return undefined;
}

/**
 * Process CSS rules and generate Tailwind class mappings
 */
function processRules(
  parsedCSS: ParsedCSS
): Map<string, TailwindClass[]> {
  const classMap = new Map<string, TailwindClass[]>();

  parsedCSS.rules.forEach(rule => {
    const properties = declarationsToProperties(rule.declarations);
    const tailwindString = mapToTailwind(properties, rule.pseudoClass);

    if (tailwindString) {
      const classes: TailwindClass[] = tailwindString.split(/\s+/).map(cls => {
        const isImportant = rule.declarations.some(d => d.important);

        return {
          className: cls,
          important: isImportant,
        };
      });

      if (classMap.has(rule.selector)) {
        classMap.get(rule.selector)!.push(...classes);
      } else {
        classMap.set(rule.selector, classes);
      }
    }
  });

  parsedCSS.mediaQueries.forEach(mediaQuery => {
    const breakpoint = mapMediaQueryToBreakpoint(mediaQuery.query);

    mediaQuery.rules.forEach(rule => {
      const properties = declarationsToProperties(rule.declarations);
      const tailwindString = mapToTailwind(properties, rule.pseudoClass);

      if (tailwindString) {
        const classes: TailwindClass[] = tailwindString
          .split(/\s+/)
          .map(cls => {
            const isImportant = rule.declarations.some(d => d.important);

            return {
              className: cls,
              variant: breakpoint,
              important: isImportant,
            };
          });

        if (classMap.has(rule.selector)) {
          classMap.get(rule.selector)!.push(...classes);
        } else {
          classMap.set(rule.selector, classes);
        }
      }
    });
  });

  return classMap;
}

/**
 * Main function to process styles
 * Converts extracted CSS to Tailwind utility classes and config
 */
export async function processStyles(
  styles: ExtractedStyles[],
  options?: StyleProcessingOptions
): Promise<ProcessedStyles> {
  const parsedCSSArray: ParsedCSS[] = [];

  // Parse all stylesheets
  styles.forEach(stylesheet => {
    const parsed = parseCSS(stylesheet.content);
    parsedCSSArray.push(parsed);
  });

  const mergedCSS = mergeParsedCSS(parsedCSSArray);
  const config = generateTailwindConfig(mergedCSS);
  const classMap = processRules(mergedCSS);
  const animations = convertKeyframesToAnimations(mergedCSS);
  const customCSS = generateCustomCSS(mergedCSS);

  const tailwindClasses: string[] = [];
  classMap.forEach(classes => {
    classes.forEach(cls => {
      let fullClass = cls.className;
      if (cls.variant) {
        fullClass = `${cls.variant}:${fullClass}`;
      }
      if (cls.important) {
        fullClass = `!${fullClass}`;
      }
      tailwindClasses.push(fullClass);
    });
  });

  const cssVariables: Record<string, string> = {};
  mergedCSS.customProperties.forEach(prop => {
    cssVariables[prop.name] = prop.value;
  });

  const mappings = Array.from(classMap.entries()).map(([selector, classes]) => ({
    originalClass: selector,
    tailwindClasses: classes.map(c => {
      let cls = c.className;
      if (c.variant) cls = `${c.variant}:${cls}`;
      if (c.important) cls = `!${cls}`;
      return cls;
    }),
    confidence: 1,
  }));

  return {
    classMap,
    tailwindClasses: Array.from(new Set(tailwindClasses)),
    customCSS,
    cssVariables,
    mappings,
    config,
    animations,
  };
}

/**
 * Generate a complete tailwind.config.js file
 */
export function generateTailwindConfigFile(
  processedStyles: ProcessedStyles
): string {
  return generateConfigFile({
    rules: [],
    keyframes: processedStyles.animations.map(anim => ({
      name: anim.name,
      steps: [],
    })),
    fontFaces: [],
    customProperties: Object.entries(processedStyles.cssVariables).map(
      ([name, value]) => ({
        name,
        value,
      })
    ),
    mediaQueries: [],
  });
}

// Export sub-modules
export { parseCSS, mergeParsedCSS } from './cssParser.js';
export { mapToTailwind, convertCSSToTailwind } from './tailwindMapper.js';
export {
  generateTailwindConfig,
  generateConfigFile,
  configToString,
} from './configGenerator.js';
export * from './types.js';
