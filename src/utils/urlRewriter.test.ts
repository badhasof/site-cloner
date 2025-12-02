/**
 * Tests for URL rewriting functionality
 */

import { URLMapper, rewriteAttributeURL, rewriteStyleAttribute } from './urlRewriter.js';
import { Asset } from '../types/index.js';

// Test data
const mockAssets: Asset[] = [
  {
    url: 'https://example.com/images/logo.png',
    type: 'image',
    localPath: 'images/logo.png',
    size: 1024
  },
  {
    url: 'https://example.com/fonts/roboto.woff2',
    type: 'font',
    localPath: 'fonts/roboto.woff2',
    size: 2048
  },
  {
    url: 'https://cdn.example.com/assets/bg.jpg',
    type: 'image',
    localPath: 'images/bg.jpg',
    size: 4096
  }
];

console.log('Testing URL Rewriter...\n');

// Test 1: URLMapper creation
console.log('Test 1: Creating URLMapper');
const urlMapper = new URLMapper(mockAssets);
const stats = urlMapper.getStats();
console.log(`✓ Created URLMapper with ${stats.totalMappings} mappings`);
console.log(`  By type:`, stats.byType);

// Test 2: Basic URL rewriting
console.log('\nTest 2: Basic URL rewriting');
const rewritten1 = urlMapper.rewriteURL('https://example.com/images/logo.png');
console.log(`  Original: https://example.com/images/logo.png`);
console.log(`  Rewritten: ${rewritten1}`);
console.log(`  ${rewritten1 === '/assets/images/logo.png' ? '✓' : '✗'} Correct rewrite`);

// Test 3: URL with query parameters
console.log('\nTest 3: URL with query parameters');
const rewritten2 = urlMapper.rewriteURL('https://example.com/images/logo.png?v=123');
console.log(`  Original: https://example.com/images/logo.png?v=123`);
console.log(`  Rewritten: ${rewritten2}`);
console.log(`  ${rewritten2 === '/assets/images/logo.png' ? '✓' : '✗'} Strips query params`);

// Test 4: Unknown URL (should return original)
console.log('\nTest 4: Unknown URL');
const rewritten3 = urlMapper.rewriteURL('https://other.com/unknown.png');
console.log(`  Original: https://other.com/unknown.png`);
console.log(`  Rewritten: ${rewritten3}`);
console.log(`  ${rewritten3 === 'https://other.com/unknown.png' ? '✓' : '✗'} Returns original`);

// Test 5: Attribute URL rewriting
console.log('\nTest 5: Attribute URL rewriting');
const srcRewrite = rewriteAttributeURL('src', 'https://example.com/images/logo.png', urlMapper);
console.log(`  src="${srcRewrite}"`);
console.log(`  ${srcRewrite === '/assets/images/logo.png' ? '✓' : '✗'} Rewrites src attribute`);

const altRewrite = rewriteAttributeURL('alt', 'Logo image', urlMapper);
console.log(`  alt="${altRewrite}"`);
console.log(`  ${altRewrite === 'Logo image' ? '✓' : '✗'} Preserves non-URL attributes`);

// Test 6: srcset rewriting
console.log('\nTest 6: srcset rewriting');
const srcset = 'https://example.com/images/logo.png 1x, https://cdn.example.com/assets/bg.jpg 2x';
const srcsetRewritten = rewriteAttributeURL('srcset', srcset, urlMapper);
console.log(`  Original: ${srcset}`);
console.log(`  Rewritten: ${srcsetRewritten}`);
const expectedSrcset = '/assets/images/logo.png 1x, /assets/images/bg.jpg 2x';
console.log(`  ${srcsetRewritten === expectedSrcset ? '✓' : '✗'} Rewrites multiple URLs in srcset`);

// Test 7: CSS url() rewriting
console.log('\nTest 7: CSS url() rewriting');
const css = `
  background-image: url('https://example.com/images/logo.png');
  font-family: 'Roboto', sans-serif;
  src: url("https://example.com/fonts/roboto.woff2");
`;
const rewrittenCSS = urlMapper.rewriteCSSUrls(css);
console.log(`  Original CSS:\n${css}`);
console.log(`  Rewritten CSS:\n${rewrittenCSS}`);
const hasRewrittenImage = rewrittenCSS.includes("url('/assets/images/logo.png')");
const hasRewrittenFont = rewrittenCSS.includes("url('/assets/fonts/roboto.woff2')");
console.log(`  ${hasRewrittenImage ? '✓' : '✗'} Rewrites background-image url()`);
console.log(`  ${hasRewrittenFont ? '✓' : '✗'} Rewrites font src url()`);

// Test 8: Inline style attribute rewriting
console.log('\nTest 8: Inline style attribute rewriting');
const inlineStyle = "background-image: url('https://cdn.example.com/assets/bg.jpg'); color: red;";
const rewrittenStyle = rewriteStyleAttribute(inlineStyle, urlMapper);
console.log(`  Original: ${inlineStyle}`);
console.log(`  Rewritten: ${rewrittenStyle}`);
const hasRewrittenBg = rewrittenStyle.includes("url('/assets/images/bg.jpg')");
console.log(`  ${hasRewrittenBg ? '✓' : '✗'} Rewrites inline style url()`);

// Test 9: Get all mappings
console.log('\nTest 9: Get all mappings');
const mappings = urlMapper.getMappings();
console.log(`  Total mappings: ${mappings.size}`);
mappings.forEach((localPath, originalUrl) => {
  console.log(`    ${originalUrl} → ${localPath}`);
});
console.log(`  ${mappings.size === mockAssets.length ? '✓' : '✗'} All assets mapped`);

console.log('\n✓ All tests completed!');
