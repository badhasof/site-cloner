/**
 * Main generator module - generates Vite + React project
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { DetectedComponent, ProcessedStyles, AnimationResult, Asset, ExtractedHTML } from '../types/index.js';
import { writeComponents } from './componentWriter.js';
import { elementToJSX } from '../scraper/htmlExtractor.js';
import { htmlToJsx } from '../utils/htmlToJsx.js';
import { URLMapper } from '../utils/urlRewriter.js';

export interface GenerateProjectOptions {
  outputDir: string;
  components: DetectedComponent[];
  styles: ProcessedStyles;
  animations: AnimationResult;
  assets: Asset[];
  html: string;
  includeAssets?: boolean;
  extractedHTML?: ExtractedHTML;
  baseUrl?: string; // Base URL for resolving relative asset URLs
}

/**
 * Main function to generate a complete Vite + React project
 */
export async function generateProject(options: GenerateProjectOptions): Promise<void> {
  const { outputDir, components, styles, animations, assets, html, includeAssets = true, extractedHTML, baseUrl } = options;

  console.log('[Generator] Starting project generation...');

  // Create URL mapper for asset URL rewriting
  const urlMapper = new URLMapper(assets, baseUrl);
  console.log('[Generator] Created URL mapper with', urlMapper.getStats().totalMappings, 'asset mappings');
  if (baseUrl) {
    console.log('[Generator] Base URL for relative path resolution:', baseUrl);
  }

  // Create directory structure
  await createProjectStructure(outputDir);

  // Write package.json
  await writePackageJson(outputDir);

  // Write vite.config.ts
  await writeViteConfig(outputDir);

  // Write tsconfig.json
  await writeTsConfig(outputDir);

  // Write tsconfig.node.json
  await writeTsConfigNode(outputDir);

  // Write tailwind.config.js
  await writeTailwindConfig(outputDir, styles);

  // Write postcss.config.js
  await writePostcssConfig(outputDir);

  // Write components
  await writeComponents(outputDir, components, styles);

  // Write main App.tsx with URL rewriting
  await writeAppComponent(outputDir, components, extractedHTML, urlMapper);

  // Write main.tsx entry point
  await writeMainEntry(outputDir);

  // Write index.html
  await writeIndexHtml(outputDir);

  // Write global styles
  await writeGlobalStyles(outputDir, styles);

  // Write animation utilities if present
  if (animations.animations.length > 0) {
    await writeAnimationUtilities(outputDir, animations);
  }

  // Copy assets if requested
  if (includeAssets && assets.length > 0) {
    await copyAssets(outputDir, assets);
  }

  console.log('[Generator] Project generation complete!');
}

async function createProjectStructure(outputDir: string): Promise<void> {
  const dirs = [
    'src',
    'src/components',
    'src/hooks',
    'src/utils',
    'src/styles',
    'public',
    'public/assets',
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(outputDir, dir), { recursive: true });
  }
}

async function writePackageJson(outputDir: string): Promise<void> {
  const packageJson = {
    name: 'cloned-site',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      'framer-motion': '^10.16.16',
    },
    devDependencies: {
      '@types/react': '^18.2.43',
      '@types/react-dom': '^18.2.17',
      '@vitejs/plugin-react': '^4.2.1',
      autoprefixer: '^10.4.16',
      postcss: '^8.4.32',
      tailwindcss: '^3.4.0',
      typescript: '^5.2.2',
      vite: '^5.0.8',
    },
  };

  await fs.writeFile(
    path.join(outputDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
    'utf-8'
  );
}

async function writeViteConfig(outputDir: string): Promise<void> {
  const config = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

  await fs.writeFile(path.join(outputDir, 'vite.config.ts'), config, 'utf-8');
}

async function writeTsConfig(outputDir: string): Promise<void> {
  const config = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  };

  await fs.writeFile(
    path.join(outputDir, 'tsconfig.json'),
    JSON.stringify(config, null, 2),
    'utf-8'
  );
}

async function writeTsConfigNode(outputDir: string): Promise<void> {
  const config = {
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
    },
    include: ['vite.config.ts'],
  };

  await fs.writeFile(
    path.join(outputDir, 'tsconfig.node.json'),
    JSON.stringify(config, null, 2),
    'utf-8'
  );
}

async function writeTailwindConfig(outputDir: string, styles: ProcessedStyles): Promise<void> {
  const config = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: ${JSON.stringify(styles.config?.theme?.extend || {}, null, 6)},
  },
  plugins: [],
}
`;

  await fs.writeFile(path.join(outputDir, 'tailwind.config.js'), config, 'utf-8');
}

async function writePostcssConfig(outputDir: string): Promise<void> {
  const config = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

  await fs.writeFile(path.join(outputDir, 'postcss.config.js'), config, 'utf-8');
}

async function writeAppComponent(
  outputDir: string,
  components: DetectedComponent[],
  extractedHTML?: ExtractedHTML,
  urlMapper?: URLMapper
): Promise<void> {
  const imports = components
    .filter(c => c.isExported)
    .map(c => `import { ${c.name} } from './components/${c.name}';`)
    .join('\n');

  const exportedComponents = components.filter(c => c.isExported);

  let content: string;

  if (exportedComponents.length > 0) {
    // If we have React components, use them
    if (exportedComponents.length === 1) {
      // Single component - use directly
      content = `      <${exportedComponents[0].name} />`;
    } else {
      // Multiple components - wrap in Fragment
      const componentUsage = exportedComponents
        .map(c => `        <${c.name} />`)
        .join('\n');
      content = `      <>\n${componentUsage}\n      </>`;
    }
  } else if (extractedHTML) {
    // Otherwise, use the extracted HTML content
    console.log('[Generator] No React components found, using extracted HTML content');
    try {
      // Pass urlMapper to elementToJSX for URL rewriting
      const jsxContent = elementToJSX(extractedHTML.structuredContent, 3, urlMapper);
      content = jsxContent;
    } catch (error) {
      console.warn('[Generator] Failed to convert extracted HTML, using fallback:', error);
      // Fallback to converting raw HTML
      const bodyMatch = extractedHTML.bodyHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : extractedHTML.bodyHtml;
      const convertedJsx = htmlToJsx(bodyContent);
      content = convertedJsx.split('\n').map(line => '      ' + line).join('\n');
    }
  } else {
    // Final fallback
    content = '      <h1>Cloned Site</h1>';
  }

  const appCode = `${imports}${imports ? '\n\n' : ''}function App() {
  return (
${content}
  );
}

export default App;
`;

  await fs.writeFile(path.join(outputDir, 'src', 'App.tsx'), appCode, 'utf-8');
}

async function writeMainEntry(outputDir: string): Promise<void> {
  const mainCode = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

  await fs.writeFile(path.join(outputDir, 'src', 'main.tsx'), mainCode, 'utf-8');
}

async function writeIndexHtml(outputDir: string): Promise<void> {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cloned Site</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  await fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf-8');
}

async function writeGlobalStyles(outputDir: string, styles: ProcessedStyles): Promise<void> {
  const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CSS */
${styles.customCSS || ''}

/* CSS Variables */
:root {
${Object.entries(styles.cssVariables || {})
  .map(([name, value]) => `  ${name}: ${value};`)
  .join('\n')}
}
`;

  await fs.writeFile(path.join(outputDir, 'src', 'styles', 'index.css'), css, 'utf-8');
}

async function writeAnimationUtilities(outputDir: string, animations: AnimationResult): Promise<void> {
  const hasAnimations = animations.framerMotionCode && animations.framerMotionCode.trim().length > 0;

  const code = hasAnimations
    ? `import { motion } from 'framer-motion';\n\n${animations.framerMotionCode}`
    : `// Animation utilities - placeholder\nexport const animations = {};`;

  await fs.writeFile(
    path.join(outputDir, 'src', 'utils', 'animations.tsx'),
    code,
    'utf-8'
  );
}

async function copyAssets(outputDir: string, assets: Asset[]): Promise<void> {
  console.log(`[Generator] Copying ${assets.length} assets...`);

  const assetsDir = path.join(outputDir, 'public', 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (const asset of assets) {
    try {
      // Determine destination path
      let destPath: string;

      if (asset.localPath) {
        // Asset was already downloaded, copy from temp location
        const filename = path.basename(asset.localPath);
        const assetTypeDir = path.join(assetsDir, `${asset.type}s`);
        await fs.mkdir(assetTypeDir, { recursive: true });
        destPath = path.join(assetTypeDir, filename);

        // Copy the file
        await fs.copyFile(asset.localPath, destPath);
        console.log(`[Generator] Copied: ${filename} (${asset.type})`);
      } else {
        // Asset was not downloaded, need to download from URL
        console.log(`[Generator] Downloading: ${asset.url}`);

        const response = await fetch(asset.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();

        // Generate filename from URL
        const urlObj = new URL(asset.url);
        let filename = path.basename(urlObj.pathname);
        if (!filename || filename === '/') {
          const ext = getExtensionForAssetType(asset.type);
          filename = `asset-${Date.now()}-${successCount}${ext}`;
        }

        // Sanitize filename
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

        const assetTypeDir = path.join(assetsDir, `${asset.type}s`);
        await fs.mkdir(assetTypeDir, { recursive: true });
        destPath = path.join(assetTypeDir, filename);

        // Write the file
        await fs.writeFile(destPath, Buffer.from(buffer));
        console.log(`[Generator] Downloaded: ${filename} (${(buffer.byteLength / 1024).toFixed(2)} KB)`);
      }

      successCount++;
    } catch (error) {
      failCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Generator] Failed to copy/download asset ${asset.url}: ${errorMsg}`);
      // Continue with next asset - don't fail the whole operation
    }
  }

  console.log(`[Generator] Asset copying complete: ${successCount} succeeded, ${failCount} failed`);
}

function getExtensionForAssetType(type: Asset['type']): string {
  switch (type) {
    case 'image':
      return '.png';
    case 'font':
      return '.woff2';
    case 'video':
      return '.mp4';
    case 'svg':
    case 'icon':
      return '.svg';
    default:
      return '';
  }
}

/**
 * Validate output directory
 */
export async function validateOutputDirectory(outputDir: string): Promise<boolean> {
  try {
    const stats = await fs.stat(outputDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if directory is empty
 */
export async function isDirectoryEmpty(outputDir: string): Promise<boolean> {
  try {
    const files = await fs.readdir(outputDir);
    return files.length === 0;
  } catch {
    return true;
  }
}
