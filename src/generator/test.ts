/**
 * Test file for generator module
 * Run with: npx tsx src/generator/test.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  generateProject,
  validateOutputDirectory,
  isDirectoryEmpty,
} from './index';
import { generatePackageJson } from './packageBuilder';
import { createViteProject } from './viteScaffold';
import { writeComponents } from './componentWriter';
import {
  DetectedComponent,
  ProcessedStyles,
  AnimationResult,
  Asset,
} from '../types';

async function cleanup(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore
  }
}

async function testPackageBuilder() {
  console.log('\n=== Testing Package Builder ===');

  const components: DetectedComponent[] = [
    {
      name: 'TestComponent',
      code: `
        import { motion } from 'framer-motion';
        import { useNavigate } from 'react-router-dom';
        import axios from 'axios';

        function TestComponent() {
          return <motion.div>Test</motion.div>
        }
      `,
      dependencies: ['react', 'framer-motion', 'react-router-dom', 'axios'],
    },
  ];

  const animations: AnimationResult = {
    library: 'framer-motion',
    animations: [],
  };

  const packageJson = generatePackageJson(components, animations);
  const parsed = JSON.parse(packageJson);

  console.log('Generated package.json dependencies:');
  console.log('- framer-motion:', parsed.dependencies['framer-motion']);
  console.log('- react-router-dom:', parsed.dependencies['react-router-dom']);
  console.log('- axios:', parsed.dependencies['axios']);
  console.log('- tailwindcss:', parsed.devDependencies['tailwindcss']);

  if (
    parsed.dependencies['framer-motion'] &&
    parsed.dependencies['react-router-dom'] &&
    parsed.dependencies['axios']
  ) {
    console.log('✓ Package builder test passed');
    return true;
  } else {
    console.log('✗ Package builder test failed');
    return false;
  }
}

async function testViteScaffold() {
  console.log('\n=== Testing Vite Scaffold ===');

  const testDir = './test-output/vite-scaffold';
  await cleanup(testDir);

  await createViteProject(testDir);

  // Check if required files exist
  const requiredFiles = [
    'index.html',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'tsconfig.json',
    'package.json',
    'src/main.tsx',
    'src/index.css',
  ];

  let allExist = true;
  for (const file of requiredFiles) {
    const exists = await fs
      .access(path.join(testDir, file))
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log(`✗ Missing file: ${file}`);
      allExist = false;
    } else {
      console.log(`✓ Found: ${file}`);
    }
  }

  await cleanup(testDir);

  if (allExist) {
    console.log('✓ Vite scaffold test passed');
    return true;
  } else {
    console.log('✗ Vite scaffold test failed');
    return false;
  }
}

async function testComponentWriter() {
  console.log('\n=== Testing Component Writer ===');

  const testDir = './test-output/component-writer';
  await cleanup(testDir);
  await fs.mkdir(testDir, { recursive: true });

  const components: DetectedComponent[] = [
    {
      name: 'Button',
      code: `function Button({ children }) {
  return <button className="btn">{children}</button>
}

export default Button;`,
      dependencies: ['react'],
    },
    {
      name: 'Card',
      code: `function Card({ title, content }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
}

export default Card;`,
      dependencies: ['react'],
    },
  ];

  const styles: ProcessedStyles = {
    classMap: {
      '.btn': ['bg-blue-500', 'text-white', 'px-4', 'py-2', 'rounded'],
      '.card': ['border', 'rounded-lg', 'p-4', 'shadow'],
    },
  };

  await writeComponents(testDir, components, styles);

  // Check if components were written
  const buttonExists = await fs
    .access(path.join(testDir, 'src/components/Button.tsx'))
    .then(() => true)
    .catch(() => false);

  const cardExists = await fs
    .access(path.join(testDir, 'src/components/Card.tsx'))
    .then(() => true)
    .catch(() => false);

  const indexExists = await fs
    .access(path.join(testDir, 'src/components/index.ts'))
    .then(() => true)
    .catch(() => false);

  if (buttonExists && cardExists && indexExists) {
    console.log('✓ All component files created');

    // Check index content
    const indexContent = await fs.readFile(
      path.join(testDir, 'src/components/index.ts'),
      'utf-8'
    );

    if (
      indexContent.includes('Button') &&
      indexContent.includes('Card')
    ) {
      console.log('✓ Component index includes all exports');
      await cleanup(testDir);
      console.log('✓ Component writer test passed');
      return true;
    }
  }

  await cleanup(testDir);
  console.log('✗ Component writer test failed');
  return false;
}

async function testFullGeneration() {
  console.log('\n=== Testing Full Project Generation ===');

  const testDir = './test-output/full-project';
  await cleanup(testDir);

  const components: DetectedComponent[] = [
    {
      name: 'App',
      code: `function App() {
  return (
    <div className="app">
      <h1>Test App</h1>
    </div>
  );
}

export default App;`,
      dependencies: ['react'],
    },
  ];

  const styles: ProcessedStyles = {
    classMap: {
      '.app': ['min-h-screen', 'bg-gray-100'],
    },
    colors: {
      primary: '#3b82f6',
    },
  };

  const animations: AnimationResult = {
    library: 'none',
    animations: [],
  };

  const assets: Asset[] = [];

  await generateProject(testDir, components, styles, animations, assets);

  // Verify key files exist
  const keyFiles = [
    'package.json',
    'src/App.tsx',
    'src/components/App.tsx',
    'tailwind.config.js',
  ];

  let allExist = true;
  for (const file of keyFiles) {
    const exists = await fs
      .access(path.join(testDir, file))
      .then(() => true)
      .catch(() => false);

    if (exists) {
      console.log(`✓ Found: ${file}`);
    } else {
      console.log(`✗ Missing: ${file}`);
      allExist = false;
    }
  }

  // Check package.json content
  const packageJson = JSON.parse(
    await fs.readFile(path.join(testDir, 'package.json'), 'utf-8')
  );

  if (packageJson.dependencies.react && packageJson.devDependencies.vite) {
    console.log('✓ Package.json has correct dependencies');
  } else {
    console.log('✗ Package.json missing dependencies');
    allExist = false;
  }

  await cleanup(testDir);

  if (allExist) {
    console.log('✓ Full generation test passed');
    return true;
  } else {
    console.log('✗ Full generation test failed');
    return false;
  }
}

async function testDirectoryValidation() {
  console.log('\n=== Testing Directory Validation ===');

  const testDir = './test-output/validation';

  // Test 1: Non-existent directory (should pass)
  await cleanup(testDir);
  try {
    await validateOutputDirectory(testDir, false);
    console.log('✓ Non-existent directory validation passed');
  } catch (error) {
    console.log('✗ Non-existent directory validation failed');
    return false;
  }

  // Test 2: Empty directory (should pass)
  await fs.mkdir(testDir, { recursive: true });
  try {
    await validateOutputDirectory(testDir, false);
    console.log('✓ Empty directory validation passed');
  } catch (error) {
    console.log('✗ Empty directory validation failed');
    await cleanup(testDir);
    return false;
  }

  // Test 3: Non-empty directory without force (should fail)
  await fs.writeFile(path.join(testDir, 'test.txt'), 'test');
  try {
    await validateOutputDirectory(testDir, false);
    console.log('✗ Non-empty directory should have failed without force');
    await cleanup(testDir);
    return false;
  } catch (error) {
    console.log('✓ Non-empty directory validation correctly failed');
  }

  // Test 4: Non-empty directory with force (should pass)
  try {
    await validateOutputDirectory(testDir, true);
    console.log('✓ Non-empty directory with force passed');
  } catch (error) {
    console.log('✗ Non-empty directory with force failed');
    await cleanup(testDir);
    return false;
  }

  await cleanup(testDir);
  console.log('✓ Directory validation tests passed');
  return true;
}

async function runAllTests() {
  console.log('====================================');
  console.log('   GENERATOR MODULE TESTS');
  console.log('====================================');

  const results = {
    packageBuilder: await testPackageBuilder(),
    viteScaffold: await testViteScaffold(),
    componentWriter: await testComponentWriter(),
    fullGeneration: await testFullGeneration(),
    directoryValidation: await testDirectoryValidation(),
  };

  console.log('\n====================================');
  console.log('   TEST RESULTS');
  console.log('====================================');

  let passed = 0;
  let total = 0;

  for (const [name, result] of Object.entries(results)) {
    total++;
    if (result) {
      passed++;
      console.log(`✓ ${name}`);
    } else {
      console.log(`✗ ${name}`);
    }
  }

  console.log('\n====================================');
  console.log(`   ${passed}/${total} tests passed`);
  console.log('====================================\n');

  // Cleanup
  await cleanup('./test-output');

  return passed === total;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test error:', error);
      process.exit(1);
    });
}

export { runAllTests };
