# Generator Module File Structure

## Source Files (`/Users/bgf/site-cloner/src/generator/`)

### Core Modules

- **index.ts** (Main API)
  - `generateProject()` - Main orchestration function
  - `validateOutputDirectory()` - Directory validation
  - `isDirectoryEmpty()` - Check if directory is empty
  - Coordinates all generation steps

- **viteScaffold.ts** (Project Structure)
  - `createViteProject()` - Creates Vite project structure
  - Generates configuration files
  - Sets up directory hierarchy
  - Creates base template files

- **packageBuilder.ts** (Dependency Detection)
  - `generatePackageJson()` - Smart dependency detection
  - Analyzes code patterns for library usage
  - Generates complete package.json with scripts
  - Supports 50+ libraries and frameworks

- **componentWriter.ts** (Component Generation)
  - `writeComponents()` - Writes React components
  - `writeUtilities()` - Writes utility functions
  - `writeHooks()` - Writes custom hooks
  - Sorts by dependencies
  - Enhances code with imports
  - Applies Tailwind classes

### Supporting Modules

- **assetDownloader.ts** (Asset Management)
  - `downloadAsset()` - Download single asset
  - `downloadAllAssets()` - Batch download with retry
  - `normalizeAssetPath()` - Clean asset paths
  - `optimizeImage()` - Image optimization (placeholder)
  - `getImageDimensions()` - Get image dimensions

- **templateCopier.ts** (Template Utilities)
  - `copyTemplateDirectory()` - Copy entire template
  - `copyTemplateFile()` - Copy with variable replacement
  - `templateExists()` - Check template existence

- **codeFormatter.ts** (Code Formatting)
  - `formatTypeScript()` - Format TS code
  - `formatJSX()` - Format JSX code
  - `addComponentHeader()` - Add file headers
  - `formatComponentExport()` - Format exports
  - Import sorting, quote normalization

### Examples and Tests

- **example.ts** (Usage Examples)
  - `exampleUsage()` - Landing page example
  - `exampleEcommerce()` - E-commerce example
  - `exampleBlog()` - Blog with routing example
  - Demonstrates various patterns

- **test.ts** (Test Suite)
  - `testPackageBuilder()` - Test dependency detection
  - `testViteScaffold()` - Test project structure
  - `testComponentWriter()` - Test component writing
  - `testFullGeneration()` - End-to-end test
  - `testDirectoryValidation()` - Test validation
  - `runAllTests()` - Run complete test suite

### Public Exports

- **exports.ts** (Module Exports)
  - Re-exports all public APIs
  - Single import point for consumers
  - Type-safe exports

### Documentation

- **README.md** - Module overview and detailed documentation
- **QUICK_START.md** - Quick start guide with examples
- **FILE_STRUCTURE.md** - This file

## Templates (`/Users/bgf/site-cloner/templates/vite-react/`)

### Configuration Files

- **vite.config.ts** - Vite configuration with React plugin
- **tailwind.config.js** - Tailwind CSS configuration
- **postcss.config.js** - PostCSS configuration
- **tsconfig.json** - TypeScript configuration
- **tsconfig.node.json** - Node TypeScript configuration
- **.gitignore** - Git ignore patterns

### HTML Template

- **index.html** - HTML entry point with meta tags

### Source Templates

- **src/main.tsx** - React entry point
- **src/App.tsx** - Base App component
- **src/index.css** - Global styles with Tailwind directives

## Type Definitions (`/Users/bgf/site-cloner/src/`)

- **types.ts** - Shared type definitions
  - `DetectedComponent` - Component structure
  - `ProcessedStyles` - Style mapping
  - `AnimationResult` - Animation configuration
  - `Asset` - Asset definition
  - `GeneratorOptions` - Generation options

## Top-Level Documentation

- **/Users/bgf/site-cloner/GENERATOR_DOCS.md** - Comprehensive documentation

## Generated Project Structure

When you run `generateProject()`, it creates:

```
output-directory/
├── public/
│   ├── images/
│   └── fonts/
├── src/
│   ├── components/
│   │   ├── [ComponentName].tsx
│   │   └── index.ts
│   ├── hooks/
│   │   └── index.ts
│   ├── utils/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── .gitignore
└── README.md
```

## Module Dependencies

```
index.ts
├── viteScaffold.ts
├── packageBuilder.ts
├── componentWriter.ts
│   └── codeFormatter.ts
├── assetDownloader.ts
└── templateCopier.ts

example.ts → index.ts
test.ts → all modules
exports.ts → all modules
```

## Usage Flow

1. **Import**: `import { generateProject } from './src/generator';`
2. **Prepare Data**: Components, styles, animations, assets
3. **Validate**: `await validateOutputDirectory(dir, force);`
4. **Generate**: `await generateProject(dir, components, styles, animations, assets);`
5. **Build**: `cd dir && npm install && npm run dev`

## Lines of Code

- index.ts: ~300 lines
- viteScaffold.ts: ~250 lines
- packageBuilder.ts: ~250 lines
- componentWriter.ts: ~300 lines
- assetDownloader.ts: ~150 lines
- templateCopier.ts: ~50 lines
- codeFormatter.ts: ~200 lines
- example.ts: ~450 lines
- test.ts: ~400 lines
- **Total: ~2,350 lines of TypeScript**

## Testing

```bash
# Run tests
npm run test

# Run examples
npm run test:example

# Build
npm run build
```

## API Summary

### Main Functions
- `generateProject()` - Generate complete project
- `validateOutputDirectory()` - Validate output location
- `createViteProject()` - Create Vite structure
- `generatePackageJson()` - Generate package.json
- `writeComponents()` - Write component files
- `downloadAllAssets()` - Download assets

### Helper Functions
- `formatTypeScript()` - Format code
- `copyTemplateFile()` - Copy templates
- `normalizeAssetPath()` - Clean paths
- `isDirectoryEmpty()` - Check directory

## Future Enhancements

- [ ] Prettier integration
- [ ] ESLint configuration
- [ ] Test file generation
- [ ] Storybook support
- [ ] Next.js support
- [ ] Image optimization with Sharp
- [ ] Bundle analysis
