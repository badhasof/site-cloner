/**
 * Example usage of the deobfuscator module
 */

import { deobfuscate, analyzeObfuscation } from './index.js';
import type { ExtractedBundle } from '../types/index.js';

/**
 * Example: Deobfuscate a webpack bundle
 */
async function exampleWebpackDeobfuscation() {
  // Example webpack bundle (simplified)
  const webpackBundle = `
    (function(modules) {
      var installedModules = {};
      function __webpack_require__(moduleId) {
        if(installedModules[moduleId]) {
          return installedModules[moduleId].exports;
        }
        var module = installedModules[moduleId] = {
          i: moduleId,
          l: false,
          exports: {}
        };
        modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
        module.l = true;
        return module.exports;
      }
      return __webpack_require__(0);
    })({
      0: function(module, exports, __webpack_require__) {
        var _0x1234 = ['Hello', 'World'];
        console.log(_0x1234[0], _0x1234[1]);
      },
      1: function(module, exports) {
        function add(a, b) { return a + b; }
        module.exports = add;
      }
    });
  `;

  // Analyze the obfuscation
  const analysis = analyzeObfuscation(webpackBundle);
  console.log('Obfuscation analysis:', analysis);

  // Create bundle object
  const bundle: ExtractedBundle = {
    url: 'https://example.com/bundle.js',
    code: webpackBundle,
    bundlerType: 'webpack',
    filename: 'bundle.js'
  };

  // Deobfuscate
  const cleanModules = await deobfuscate([bundle]);

  // Print results
  console.log(`\nDeobfuscated ${cleanModules.length} modules:`);
  cleanModules.forEach(mod => {
    console.log(`\n--- Module ${mod.id} ---`);
    console.log(`Success: ${mod.success}`);
    if (mod.success) {
      console.log('Cleaned code:');
      console.log(mod.code);
    } else {
      console.log('Errors:', mod.errors);
      console.log('Original code (fallback):');
      console.log(mod.code);
    }
  });
}

/**
 * Example: Deobfuscate minified code
 */
async function exampleMinifiedDeobfuscation() {
  const minifiedCode = `
    function _0x1a2b(){var _0x3c4d=['log','Hello\x20World'];return _0x1a2b=function(){return _0x3c4d;},_0x1a2b();}
    var _0x5e6f=_0x1a2b();console[_0x5e6f[0x0]](_0x5e6f[0x1]);
  `.trim();

  const bundle: ExtractedBundle = {
    url: 'https://example.com/minified.js',
    code: minifiedCode,
    filename: 'minified.js'
  };

  const cleanModules = await deobfuscate([bundle]);

  console.log('\nMinified code deobfuscation result:');
  cleanModules.forEach(mod => {
    console.log(`Module ${mod.id}:`);
    console.log(mod.code);
  });
}

/**
 * Run examples
 */
async function main() {
  console.log('=== Deobfuscator Examples ===\n');

  try {
    console.log('Example 1: Webpack Bundle');
    await exampleWebpackDeobfuscation();

    console.log('\n\nExample 2: Minified Code');
    await exampleMinifiedDeobfuscation();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// main();
