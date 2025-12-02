/**
 * CSS Parser Module
 * Parses CSS using css-tree and extracts all rules, keyframes, font-faces, and custom properties
 */

import * as csstree from 'css-tree';
import {
  ParsedCSS,
  ParsedCSSRule,
  CSSDeclaration,
  ParsedKeyframe,
  KeyframeStep,
  FontFace,
  CustomProperty,
  MediaQuery,
} from './types.js';

/**
 * Calculate CSS selector specificity
 * Returns a number representing specificity (higher = more specific)
 */
function calculateSpecificity(selector: string): number {
  const cleanSelector = selector.replace(/::/g, ':');
  let specificity = 0;

  // ID selectors (#id) = 100
  const idMatches = cleanSelector.match(/#[\w-]+/g);
  specificity += (idMatches?.length || 0) * 100;

  // Class selectors (.class), attribute selectors ([attr]), pseudo-classes (:hover) = 10
  const classMatches = cleanSelector.match(/\.[\w-]+/g);
  const attrMatches = cleanSelector.match(/\[[\w-]+/g);
  const pseudoMatches = cleanSelector.match(/:[\w-]+/g);
  specificity += (classMatches?.length || 0) * 10;
  specificity += (attrMatches?.length || 0) * 10;
  specificity += (pseudoMatches?.length || 0) * 10;

  // Element selectors (div, h1) = 1
  const elementMatches = cleanSelector.match(/(?:^|[\s>+~])([a-z][\w-]*)/gi);
  specificity += (elementMatches?.length || 0) * 1;

  return specificity;
}

/**
 * Extract pseudo-class from selector if present
 */
function extractPseudoClass(selector: string): { cleanSelector: string; pseudoClass?: string } {
  const pseudoClassMatch = selector.match(/:(?:hover|focus|active|visited|focus-within|focus-visible|disabled|enabled|checked|invalid|valid|required|optional|first-child|last-child|nth-child|nth-of-type)/);

  if (pseudoClassMatch) {
    return {
      cleanSelector: selector.replace(pseudoClassMatch[0], '').trim(),
      pseudoClass: pseudoClassMatch[0].slice(1),
    };
  }

  return { cleanSelector: selector };
}

/**
 * Parse CSS declarations from a css-tree Block node
 */
function parseDeclarations(declarationList: csstree.DeclarationList | null): CSSDeclaration[] {
  if (!declarationList) return [];

  const declarations: CSSDeclaration[] = [];

  csstree.walk(declarationList, {
    visit: 'Declaration',
    enter(node) {
      const property = node.property;
      const value = csstree.generate(node.value);
      const important = node.important || false;

      declarations.push({
        property,
        value,
        important,
      });
    },
  });

  return declarations;
}

/**
 * Parse style rules from CSS AST
 */
function parseStyleRules(ast: csstree.CssNode, mediaQuery?: string): ParsedCSSRule[] {
  const rules: ParsedCSSRule[] = [];

  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      if (node.type !== 'Rule') return;

      const selectorList = csstree.generate(node.prelude);
      const selectors = selectorList.split(',').map(s => s.trim());

      const declarations = parseDeclarations(node.block);

      selectors.forEach(selector => {
        const { cleanSelector, pseudoClass } = extractPseudoClass(selector);

        rules.push({
          selector: cleanSelector,
          declarations,
          pseudoClass,
          mediaQuery,
          specificity: calculateSpecificity(selector),
        });
      });
    },
  });

  return rules;
}

/**
 * Parse @keyframes animations
 */
function parseKeyframes(ast: csstree.CssNode): ParsedKeyframe[] {
  const keyframes: ParsedKeyframe[] = [];

  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.name !== 'keyframes') return;

      const name = csstree.generate(node.prelude);
      const steps: KeyframeStep[] = [];

      if (node.block) {
        csstree.walk(node.block, {
          visit: 'Rule',
          enter(ruleNode) {
            if (ruleNode.type !== 'Rule') return;

            const offset = csstree.generate(ruleNode.prelude);
            const declarations = parseDeclarations(ruleNode.block);

            steps.push({ offset, declarations });
          },
        });
      }

      keyframes.push({ name, steps });
    },
  });

  return keyframes;
}

/**
 * Parse @font-face declarations
 */
function parseFontFaces(ast: csstree.CssNode): FontFace[] {
  const fontFaces: FontFace[] = [];

  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.name !== 'font-face' || !node.block) return;

      const fontFace: Partial<FontFace> = {
        src: [],
      };

      csstree.walk(node.block, {
        visit: 'Declaration',
        enter(declNode) {
          const property = declNode.property;
          const value = csstree.generate(declNode.value);

          switch (property) {
            case 'font-family':
              fontFace.fontFamily = value.replace(/['"]/g, '');
              break;
            case 'src':
              fontFace.src = value.split(',').map(s => s.trim());
              break;
            case 'font-weight':
              fontFace.fontWeight = value;
              break;
            case 'font-style':
              fontFace.fontStyle = value;
              break;
            case 'font-display':
              fontFace.fontDisplay = value;
              break;
          }
        },
      });

      if (fontFace.fontFamily && fontFace.src && fontFace.src.length > 0) {
        fontFaces.push(fontFace as FontFace);
      }
    },
  });

  return fontFaces;
}

/**
 * Parse CSS custom properties (CSS variables)
 */
function parseCustomProperties(ast: csstree.CssNode): CustomProperty[] {
  const customProperties: CustomProperty[] = [];

  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      if (node.type !== 'Rule') return;

      const selector = csstree.generate(node.prelude);

      csstree.walk(node.block, {
        visit: 'Declaration',
        enter(declNode) {
          const property = declNode.property;

          if (property.startsWith('--')) {
            const value = csstree.generate(declNode.value);

            customProperties.push({
              name: property,
              value,
              scope: selector,
            });
          }
        },
      });
    },
  });

  return customProperties;
}

/**
 * Parse @media queries
 */
function parseMediaQueries(ast: csstree.CssNode): MediaQuery[] {
  const mediaQueries: MediaQuery[] = [];

  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.name !== 'media' || !node.block) return;

      const query = csstree.generate(node.prelude);
      const rules = parseStyleRules(node.block, query);

      mediaQueries.push({ query, rules });
    },
  });

  return mediaQueries;
}

/**
 * Main CSS parser function
 */
export function parseCSS(css: string): ParsedCSS {
  try {
    const ast = csstree.parse(css, {
      parseAtrulePrelude: true,
      parseRulePrelude: true,
      parseValue: true,
      parseCustomProperty: true,
    });

    const rules = parseStyleRules(ast);
    const keyframes = parseKeyframes(ast);
    const fontFaces = parseFontFaces(ast);
    const customProperties = parseCustomProperties(ast);
    const mediaQueries = parseMediaQueries(ast);

    return {
      rules,
      keyframes,
      fontFaces,
      customProperties,
      mediaQueries,
    };
  } catch (error) {
    console.error('Error parsing CSS:', error);

    return {
      rules: [],
      keyframes: [],
      fontFaces: [],
      customProperties: [],
      mediaQueries: [],
    };
  }
}

/**
 * Merge multiple ParsedCSS objects
 */
export function mergeParsedCSS(parsedCSSArray: ParsedCSS[]): ParsedCSS {
  const merged: ParsedCSS = {
    rules: [],
    keyframes: [],
    fontFaces: [],
    customProperties: [],
    mediaQueries: [],
  };

  parsedCSSArray.forEach(parsed => {
    merged.rules.push(...parsed.rules);
    merged.keyframes.push(...parsed.keyframes);
    merged.fontFaces.push(...parsed.fontFaces);
    merged.customProperties.push(...parsed.customProperties);
    merged.mediaQueries.push(...parsed.mediaQueries);
  });

  merged.rules.sort((a, b) => (a.specificity || 0) - (b.specificity || 0));

  return merged;
}
