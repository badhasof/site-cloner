/**
 * Example usage of the animations module
 * This demonstrates how to extract and convert animations from a website
 */

import { chromium } from 'playwright';
import { extractAnimations, analyzeAnimationPerformance, detectAnimationTriggers } from './index.js';
import type { ExtractedStyles } from '../types/animations.js';

async function exampleUsage() {
  // 1. Launch browser and navigate to page
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://example.com', { waitUntil: 'networkidle' });

  // 2. Extract styles from the page
  const styles: ExtractedStyles = {
    css: await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            console.warn('Could not read stylesheet:', e);
            return '';
          }
        })
        .join('\n');
    })
  };

  // 3. Extract all animations
  console.log('\n=== Extracting Animations ===\n');
  const result = await extractAnimations(page, styles);

  // 4. Display results
  console.log('\n=== Results ===\n');
  console.log(`Total animations found: ${result.animations.length}`);
  console.log(`CSS keyframe animations: ${result.cssAnimations.length}`);
  console.log(`Scroll animations: ${result.scrollAnimations.length}`);

  // 5. Analyze performance
  console.log('\n=== Performance Analysis ===\n');
  const analysis = analyzeAnimationPerformance(result.animations);
  console.log(`Total: ${analysis.total}`);
  console.log('Breakdown by type:', analysis.byType);

  if (analysis.warnings.length > 0) {
    console.log('\nWarnings:');
    analysis.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  // 6. Detect animation libraries
  const html = await page.content();
  const triggers = detectAnimationTriggers(html, styles.css);
  console.log('\n=== Detected Animation Libraries ===\n');
  triggers.forEach(trigger => console.log(`  - ${trigger}`));

  // 7. Show sample animations
  console.log('\n=== Sample Animations ===\n');
  result.animations.slice(0, 3).forEach((anim, idx) => {
    console.log(`\n${idx + 1}. ${anim.type.toUpperCase()} - ${anim.selector}`);
    console.log(`   Duration: ${anim.timing.duration}ms`);
    console.log(`   Easing: ${anim.timing.easing}`);
    if (anim.keyframes.length > 0) {
      console.log(`   Keyframes: ${anim.keyframes.length}`);
      console.log(`   Properties: ${Object.keys(anim.keyframes[0].properties).join(', ')}`);
    }
  });

  // 8. Display generated Framer Motion code
  console.log('\n=== Generated Framer Motion Code ===\n');
  console.log(result.framerMotionCode.substring(0, 500) + '...\n');

  // 9. Export to file (optional)
  // import fs from 'fs';
  // fs.writeFileSync('animations.json', JSON.stringify(result, null, 2));
  // fs.writeFileSync('animations.tsx', result.framerMotionCode);

  await browser.close();
}

// Run the example
exampleUsage().catch(console.error);

/**
 * Example: Extract animations for a specific element
 */
async function extractElementAnimations() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com');

  const styles: ExtractedStyles = {
    css: await page.evaluate(() =>
      Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n')
    )
  };

  const result = await extractAnimations(page, styles);

  // Filter animations for a specific selector
  const heroAnimations = result.animations.filter(anim =>
    anim.selector.includes('hero')
  );

  console.log(`Found ${heroAnimations.length} animations for hero section`);

  await browser.close();
}

/**
 * Example: Generate Framer Motion components
 */
import { generateAnimationComponents } from './index.js';

async function generateComponents() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com');

  const styles: ExtractedStyles = {
    css: await page.evaluate(() => {
      try {
        return Array.from(document.styleSheets)
          .map(s => Array.from(s.cssRules).map(r => r.cssText).join('\n'))
          .join('\n');
      } catch (e) {
        return '';
      }
    })
  };

  const result = await extractAnimations(page, styles);

  // Generate React components with Framer Motion
  const components = generateAnimationComponents(result.animations);

  console.log('Generated components:');
  console.log(components);

  await browser.close();
}

/**
 * Example: Working with different animation types
 */
async function demonstrateAnimationTypes() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com');

  const styles: ExtractedStyles = {
    css: await page.evaluate(() => {
      try {
        return Array.from(document.styleSheets)
          .map(s => Array.from(s.cssRules).map(r => r.cssText).join('\n'))
          .join('\n');
      } catch (e) {
        return '';
      }
    })
  };

  const result = await extractAnimations(page, styles);

  // Group by type
  const byType: Record<string, number> = {};

  for (const anim of result.animations) {
    byType[anim.type] = (byType[anim.type] || 0) + 1;
  }

  console.log('\nAnimations by type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  // Show examples of each type
  const types = ['hover', 'scroll', 'viewport', 'css-animation'];

  for (const type of types) {
    const example = result.animations.find(a => a.type === type);
    if (example) {
      console.log(`\n${type.toUpperCase()} example:`);
      console.log(`  Selector: ${example.selector}`);
      console.log(`  Duration: ${example.timing.duration}ms`);
      if (example.trigger) {
        console.log(`  Trigger: ${JSON.stringify(example.trigger)}`);
      }
    }
  }

  await browser.close();
}
