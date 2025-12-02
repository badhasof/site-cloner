/**
 * Style Extractor - Collects CSS from various sources
 */

import { Page } from 'playwright';
import { ExtractedStyles } from '../types/index.js';

/**
 * Fetches external stylesheet content
 */
async function fetchStylesheet(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`[StyleExtractor] Failed to fetch ${url}:`, error);
    return '';
  }
}

/**
 * Extracts all styles from the page
 */
export async function extractStyles(page: Page): Promise<ExtractedStyles[]> {
  const styles: ExtractedStyles[] = [];

  // Extract external stylesheets
  const externalStyles = await page.evaluate(() => {
    const links: Array<{ url: string; media?: string }> = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');
      const media = link.getAttribute('media') || undefined;
      if (href) {
        // Convert relative URLs to absolute
        const url = new URL(href, window.location.href).href;
        links.push({ url, media });
      }
    });
    return links;
  });

  // Fetch external stylesheets
  for (const { url, media } of externalStyles) {
    const content = await fetchStylesheet(url);
    if (content) {
      styles.push({
        url,
        content,
        type: 'external',
        mediaQuery: media,
      });
      console.log(`[StyleExtractor] Fetched external stylesheet: ${url} (${(content.length / 1024).toFixed(2)} KB)`);
    }
  }

  // Extract inline styles
  const inlineStyles = await page.evaluate(() => {
    const styleContents: string[] = [];
    document.querySelectorAll('style').forEach((style) => {
      const content = style.textContent || '';
      if (content.trim().length > 0) {
        styleContents.push(content);
      }
    });
    return styleContents;
  });

  inlineStyles.forEach((content, index) => {
    styles.push({
      url: `inline-style-${index}`,
      content,
      type: 'inline',
    });
  });

  console.log(`[StyleExtractor] Extracted ${inlineStyles.length} inline styles`);

  // Extract computed styles for visible elements
  const computedStyles = await extractComputedStyles(page);
  if (computedStyles) {
    styles.push(computedStyles);
  }

  console.log(`[StyleExtractor] Total styles extracted: ${styles.length}`);

  return styles;
}

/**
 * Extracts computed styles from visible elements
 */
async function extractComputedStyles(page: Page): Promise<ExtractedStyles | null> {
  try {
    const computedCSS = await page.evaluate(() => {
      const cssRules: string[] = [];
      const processedElements = new Set<Element>();

      // Get all visible elements
      const allElements = document.querySelectorAll('*');
      allElements.forEach((element) => {
        // Skip if already processed or not visible
        if (processedElements.has(element)) return;

        const rect = element.getBoundingClientRect();
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          window.getComputedStyle(element).display !== 'none' &&
          window.getComputedStyle(element).visibility !== 'hidden';

        if (!isVisible) return;

        processedElements.add(element);

        // Get computed style
        const computed = window.getComputedStyle(element);

        // Important CSS properties to capture
        const importantProps = [
          'display',
          'position',
          'width',
          'height',
          'margin',
          'padding',
          'border',
          'background',
          'color',
          'font',
          'flex',
          'grid',
          'transform',
          'transition',
          'animation',
          'z-index',
          'opacity',
        ];

        const styles: string[] = [];
        importantProps.forEach((prop) => {
          const value = computed.getPropertyValue(prop);
          if (value && value !== 'none' && value !== 'normal') {
            styles.push(`  ${prop}: ${value};`);
          }
        });

        if (styles.length > 0) {
          // Generate a selector (simplified - uses tag and classes)
          let selector = element.tagName.toLowerCase();
          if (element.id) {
            selector += `#${element.id}`;
          }
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(Boolean);
            if (classes.length > 0) {
              // Escape special characters in class names for CSS selectors
              const escapedClasses = classes.map(c =>
                c.replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/:/g, '\\:')
              );
              selector += '.' + escapedClasses.join('.');
            }
          }

          cssRules.push(`${selector} {\n${styles.join('\n')}\n}`);
        }
      });

      return cssRules.join('\n\n');
    });

    if (computedCSS.trim().length > 0) {
      console.log(`[StyleExtractor] Extracted computed styles (${(computedCSS.length / 1024).toFixed(2)} KB)`);
      return {
        url: 'computed-styles',
        content: computedCSS,
        type: 'computed',
      };
    }
  } catch (error) {
    console.error('[StyleExtractor] Error extracting computed styles:', error);
  }

  return null;
}

/**
 * Extracts keyframe animations from CSS
 */
export async function extractKeyframes(page: Page): Promise<string[]> {
  const keyframes = await page.evaluate(() => {
    const keyframeRules: string[] = [];

    // Iterate through all stylesheets
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.cssRules) continue;

        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSKeyframesRule) {
            keyframeRules.push(rule.cssText);
          }
        }
      } catch (error) {
        // Cross-origin stylesheets may throw errors
        console.warn('Could not access stylesheet:', error);
      }
    }

    return keyframeRules;
  });

  console.log(`[StyleExtractor] Extracted ${keyframes.length} keyframe animations`);

  return keyframes;
}

/**
 * Extracts CSS variables (custom properties)
 */
export async function extractCSSVariables(page: Page): Promise<Record<string, string>> {
  const variables = await page.evaluate(() => {
    const vars: Record<string, string> = {};
    const computed = window.getComputedStyle(document.documentElement);

    // Get all custom properties from :root
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith('--')) {
        vars[prop] = computed.getPropertyValue(prop).trim();
      }
    }

    return vars;
  });

  console.log(`[StyleExtractor] Extracted ${Object.keys(variables).length} CSS variables`);

  return variables;
}
