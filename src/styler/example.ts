/**
 * Example usage of the styler module
 */

import { processStyles } from './index';
import { ExtractedStyles } from '../types/index';

async function runExample() {
  console.log('=== Styler Module Example ===\n');

  // Sample extracted styles
  const extractedStyles: ExtractedStyles = {
    externalStylesheets: [
      {
        url: 'https://example.com/styles.css',
        content: `
          /* Base styles */
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          .button {
            display: inline-flex;
            align-items: center;
            padding: 12px 24px;
            background-color: #3b82f6;
            color: white;
            border-radius: 8px;
            font-weight: 600;
            transition: background-color 0.3s ease;
          }

          .button:hover {
            background-color: #2563eb;
          }

          .button:active {
            transform: scale(0.95);
          }

          /* Typography */
          .heading {
            font-size: 36px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 16px;
            color: #1f2937;
          }

          /* Layout */
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }

          @media (min-width: 768px) {
            .container {
              padding: 40px;
            }

            .heading {
              font-size: 48px;
            }
          }

          /* Animations */
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .fade-in {
            animation: fadeIn 0.5s ease-out;
          }

          /* Custom properties */
          :root {
            --primary-color: #3b82f6;
            --secondary-color: #8b5cf6;
            --spacing-unit: 8px;
          }

          /* Font face */
          @font-face {
            font-family: 'CustomFont';
            src: url('/fonts/custom-font.woff2') format('woff2');
            font-weight: 400;
            font-display: swap;
          }
        `,
      },
    ],
    inlineStyles: [
      `
      .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .card:hover {
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15);
      }
      `,
    ],
    rules: [],
    keyframes: [],
    computedStyles: new Map(),
  };

  try {
    console.log('Processing styles...\n');

    const processed = await processStyles(extractedStyles);

    console.log('✓ Styles processed successfully!\n');

    // Display Tailwind classes
    console.log('=== Generated Tailwind Classes ===');
    console.log('Total unique classes:', processed.tailwindClasses.length);
    console.log('\nSample classes:');
    processed.tailwindClasses.slice(0, 20).forEach(cls => {
      console.log(`  ${cls}`);
    });

    // Display class mappings
    console.log('\n=== Class Mappings ===');
    let count = 0;
    for (const [selector, classes] of processed.classMap) {
      if (count < 5) {
        const classString = classes
          .map(c => {
            let cls = c.className;
            if (c.variant) cls = `${c.variant}:${cls}`;
            if (c.important) cls = `!${cls}`;
            return cls;
          })
          .join(' ');

        console.log(`\n${selector}:`);
        console.log(`  ${classString}`);
        count++;
      }
    }

    // Display Tailwind config
    console.log('\n=== Tailwind Config (Extended) ===');
    if (processed.config.theme.extend.colors) {
      console.log('\nColors:');
      Object.entries(processed.config.theme.extend.colors)
        .slice(0, 5)
        .forEach(([name, value]) => {
          console.log(`  ${name}: ${value}`);
        });
    }

    if (processed.config.theme.extend.animation) {
      console.log('\nAnimations:');
      Object.entries(processed.config.theme.extend.animation).forEach(
        ([name, value]) => {
          console.log(`  ${name}: ${value}`);
        }
      );
    }

    if (processed.config.theme.extend.keyframes) {
      console.log('\nKeyframes:');
      Object.keys(processed.config.theme.extend.keyframes).forEach(name => {
        console.log(`  @keyframes ${name}`);
      });
    }

    // Display CSS variables
    console.log('\n=== CSS Custom Properties ===');
    Object.entries(processed.cssVariables).forEach(([name, value]) => {
      console.log(`  ${name}: ${value}`);
    });

    // Display custom CSS
    console.log('\n=== Custom CSS (non-Tailwind) ===');
    console.log(
      'Length:',
      processed.customCSS.length,
      'characters\n'
    );
    console.log(processed.customCSS.slice(0, 500));
    if (processed.customCSS.length > 500) {
      console.log('...\n[truncated]');
    }

    // Display animations
    console.log('\n=== Extracted Animations ===');
    processed.animations.forEach(anim => {
      console.log(`\nAnimation: ${anim.name}`);
      if (anim.duration) console.log(`  Duration: ${anim.duration}`);
      if (anim.timingFunction)
        console.log(`  Timing: ${anim.timingFunction}`);
      if (anim.iterationCount)
        console.log(`  Iterations: ${anim.iterationCount}`);
    });

    console.log('\n=== Example Complete ===');
  } catch (error) {
    console.error('Error processing styles:', error);
    throw error;
  }
}

// Run the example
runExample().catch(console.error);
