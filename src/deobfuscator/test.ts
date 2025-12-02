/**
 * Simple test file for the deobfuscator module
 * Run with: npx ts-node src/deobfuscator/test.ts
 */

import { deobfuscate, analyzeObfuscation } from './index.js';
import type { ExtractedBundle } from '../types/index.js';

async function testBasicDeobfuscation() {
  console.log('=== Testing Basic Deobfuscation ===\n');

  // Simple obfuscated code
  const obfuscatedCode = `
    var _0x1234 = ['Hello', 'World', 'log'];
    function _0x5678() {
      console[_0x1234[2]](_0x1234[0], _0x1234[1]);
    }
    _0x5678();
  `;

  // Analyze obfuscation
  const analysis = analyzeObfuscation(obfuscatedCode);
  console.log('Obfuscation Analysis:', analysis);

  // Create bundle
  const bundle: ExtractedBundle = {
    url: 'https://example.com/test.js',
    code: obfuscatedCode,
    filename: 'test.js'
  };

  // Deobfuscate
  try {
    const result = await deobfuscate([bundle]);
    console.log('\nDeobfuscation Result:');
    console.log(`- Total modules: ${result.length}`);
    console.log(`- Successful: ${result.filter(m => m.success).length}`);
    console.log(`- Failed: ${result.filter(m => !m.success).length}`);

    if (result.length > 0) {
      console.log('\nFirst module:');
      console.log('Success:', result[0].success);
      console.log('Code preview:', result[0].code.substring(0, 200));
    }
  } catch (error) {
    console.error('Error during deobfuscation:', error);
  }
}

async function testWebpackBundle() {
  console.log('\n\n=== Testing Webpack Bundle ===\n');

  const webpackCode = `
    (function(modules) {
      function __webpack_require__(moduleId) {
        return modules[moduleId]();
      }
      return __webpack_require__(0);
    })({
      0: function() {
        var msg = 'Hello from module 0';
        console.log(msg);
      },
      1: function() {
        return { value: 42 };
      }
    });
  `;

  const bundle: ExtractedBundle = {
    url: 'https://example.com/bundle.js',
    code: webpackCode,
    bundlerType: 'webpack',
    filename: 'bundle.js'
  };

  try {
    const result = await deobfuscate([bundle]);
    console.log('Webpack Bundle Result:');
    console.log(`- Total modules: ${result.length}`);
    console.log(`- Successful: ${result.filter(m => m.success).length}`);

    result.forEach((mod, idx) => {
      console.log(`\nModule ${mod.id}:`);
      console.log(`  Success: ${mod.success}`);
      console.log(`  Code length: ${mod.code.length} chars`);
    });
  } catch (error) {
    console.error('Error during webpack deobfuscation:', error);
  }
}

async function main() {
  console.log('Deobfuscator Module Test Suite\n');
  console.log('Node version:', process.version);
  console.log('=====================================\n');

  await testBasicDeobfuscation();
  await testWebpackBundle();

  console.log('\n\n=== All Tests Complete ===');
}

// Run tests
main().catch(console.error);
