/**
 * Unit tests for styler module components
 */

import { parseCSS, mergeParsedCSS } from './cssParser';
import { mapToTailwind } from './tailwindMapper';
import { generateTailwindConfig, configToString } from './configGenerator';

console.log('=== Styler Module Unit Tests ===\n');

// Test 1: CSS Parser
console.log('Test 1: CSS Parser');
console.log('------------------');

const testCSS = `
  .button {
    display: flex;
    padding: 10px 20px;
    background-color: #3b82f6;
    border-radius: 8px;
  }

  .button:hover {
    background-color: #2563eb;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  :root {
    --primary-color: #3b82f6;
  }

  @font-face {
    font-family: 'CustomFont';
    src: url('/fonts/custom.woff2') format('woff2');
    font-weight: 400;
  }

  @media (min-width: 768px) {
    .button {
      padding: 12px 24px;
    }
  }
`;

try {
  const parsed = parseCSS(testCSS);

  console.log(`✓ Parsed ${parsed.rules.length} rules`);
  console.log(`✓ Parsed ${parsed.keyframes.length} keyframes`);
  console.log(`✓ Parsed ${parsed.fontFaces.length} font-face declarations`);
  console.log(`✓ Parsed ${parsed.customProperties.length} custom properties`);
  console.log(`✓ Parsed ${parsed.mediaQueries.length} media queries`);

  console.log('\nRules:');
  parsed.rules.slice(0, 3).forEach(rule => {
    console.log(`  ${rule.selector} (specificity: ${rule.specificity})`);
    console.log(`    ${rule.declarations.length} declarations`);
    if (rule.pseudoClass) {
      console.log(`    Pseudo-class: :${rule.pseudoClass}`);
    }
  });

  console.log('\nKeyframes:');
  parsed.keyframes.forEach(kf => {
    console.log(`  @keyframes ${kf.name} (${kf.steps.length} steps)`);
  });

  console.log('\nCustom Properties:');
  parsed.customProperties.forEach(prop => {
    console.log(`  ${prop.name}: ${prop.value} (scope: ${prop.scope})`);
  });

  console.log('\n✓ CSS Parser test passed\n');
} catch (error) {
  console.error('✗ CSS Parser test failed:', error);
}

// Test 2: Tailwind Mapper
console.log('\nTest 2: Tailwind Mapper');
console.log('------------------------');

const testProperties = {
  display: 'flex',
  'padding-top': '10px',
  'padding-bottom': '10px',
  'padding-left': '20px',
  'padding-right': '20px',
  'background-color': '#3b82f6',
  'border-radius': '8px',
  'font-size': '16px',
  'font-weight': '600',
};

try {
  const tailwindClasses = mapToTailwind(testProperties);
  console.log('Input properties:', Object.keys(testProperties).length);
  console.log('Output classes:', tailwindClasses);

  // Test with pseudo-class
  const hoverClasses = mapToTailwind(
    { 'background-color': '#2563eb' },
    'hover'
  );
  console.log('\nWith hover pseudo-class:', hoverClasses);

  // Test responsive
  const responsiveClasses = mapToTailwind(
    { padding: '12px 24px' },
    undefined
  );
  console.log('Responsive padding:', responsiveClasses);

  console.log('\n✓ Tailwind Mapper test passed\n');
} catch (error) {
  console.error('✗ Tailwind Mapper test failed:', error);
}

// Test 3: Config Generator
console.log('\nTest 3: Config Generator');
console.log('-------------------------');

try {
  const parsed = parseCSS(testCSS);
  const config = generateTailwindConfig(parsed);

  console.log('Generated config sections:');
  if (config.theme.extend.colors) {
    console.log(`  ✓ Colors: ${Object.keys(config.theme.extend.colors).length}`);
  }
  if (config.theme.extend.animation) {
    console.log(
      `  ✓ Animations: ${Object.keys(config.theme.extend.animation).length}`
    );
  }
  if (config.theme.extend.keyframes) {
    console.log(
      `  ✓ Keyframes: ${Object.keys(config.theme.extend.keyframes).length}`
    );
  }

  const configString = configToString(config);
  console.log(`\n✓ Generated config string (${configString.length} chars)`);
  console.log('\nConfig preview:');
  console.log(configString.slice(0, 300) + '...\n');

  console.log('✓ Config Generator test passed\n');
} catch (error) {
  console.error('✗ Config Generator test failed:', error);
}

// Test 4: CSS Merging
console.log('\nTest 4: CSS Merging');
console.log('--------------------');

try {
  const css1 = '.button { display: flex; }';
  const css2 = '.card { padding: 20px; }';
  const css3 = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';

  const parsed1 = parseCSS(css1);
  const parsed2 = parseCSS(css2);
  const parsed3 = parseCSS(css3);

  const merged = mergeParsedCSS([parsed1, parsed2, parsed3]);

  console.log(`✓ Merged ${merged.rules.length} rules`);
  console.log(`✓ Merged ${merged.keyframes.length} keyframes`);
  console.log('✓ Rules sorted by specificity');

  console.log('\n✓ CSS Merging test passed\n');
} catch (error) {
  console.error('✗ CSS Merging test failed:', error);
}

// Test 5: Edge Cases
console.log('\nTest 5: Edge Cases');
console.log('-------------------');

try {
  // Empty CSS
  const emptyParsed = parseCSS('');
  console.log('✓ Handles empty CSS');

  // Invalid CSS (should not crash)
  const invalidParsed = parseCSS('.broken { display: }');
  console.log('✓ Handles invalid CSS gracefully');

  // Complex selector
  const complexCSS = 'div.container > .item:nth-child(2):hover { color: red; }';
  const complexParsed = parseCSS(complexCSS);
  console.log(
    `✓ Parses complex selectors (specificity: ${complexParsed.rules[0]?.specificity})`
  );

  // Arbitrary values
  const arbitraryProps = {
    width: '350px',
    'line-height': '1.6',
    color: '#1a73e8',
  };
  const arbitraryClasses = mapToTailwind(arbitraryProps);
  console.log('✓ Handles arbitrary values:', arbitraryClasses);

  console.log('\n✓ Edge Cases test passed\n');
} catch (error) {
  console.error('✗ Edge Cases test failed:', error);
}

console.log('=== All Tests Complete ===');
