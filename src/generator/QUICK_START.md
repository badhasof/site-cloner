# Generator Module - Quick Start Guide

## Installation

```bash
cd site-cloner
npm install
```

## Basic Usage

```typescript
import { generateProject } from './src/generator';

// Minimal example
await generateProject(
  './output',        // Output directory
  components,        // Your components
  styles,           // Processed styles
  animations,       // Animation config
  assets            // Assets to include
);
```

## 5-Minute Example

```typescript
import { generateProject } from './src/generator';

// 1. Define a simple component
const components = [
  {
    name: 'HelloWorld',
    code: `
      function HelloWorld() {
        return (
          <div className="container">
            <h1 className="title">Hello, World!</h1>
            <p className="subtitle">Welcome to your generated site</p>
          </div>
        );
      }
      export default HelloWorld;
    `,
    dependencies: ['react'],
    hooks: [],
  },
];

// 2. Define Tailwind styles
const styles = {
  classMap: {
    '.container': ['min-h-screen', 'flex', 'flex-col', 'items-center', 'justify-center', 'bg-gray-100'],
    '.title': ['text-4xl', 'font-bold', 'text-gray-900', 'mb-2'],
    '.subtitle': ['text-lg', 'text-gray-600'],
  },
  colors: {
    primary: '#3b82f6',
  },
};

// 3. Set animation config (none for this example)
const animations = {
  library: 'none',
  animations: [],
};

// 4. Generate the project
await generateProject(
  './my-first-site',
  components,
  styles,
  animations,
  []  // No assets
);

// 5. Run the generated project
console.log('Generated! Now run:');
console.log('  cd my-first-site');
console.log('  npm install');
console.log('  npm run dev');
```

## Common Patterns

### Pattern 1: Landing Page

```typescript
const components = [
  { name: 'Hero', code: '...', dependencies: ['react'] },
  { name: 'Features', code: '...', dependencies: ['react'] },
  { name: 'CTA', code: '...', dependencies: ['react'] },
];

await generateProject('./landing', components, styles, animations, assets);
```

### Pattern 2: With Animations

```typescript
const animations = {
  library: 'framer-motion',
  animations: [
    {
      type: 'fadeIn',
      target: '.hero',
      properties: { initial: { opacity: 0 }, animate: { opacity: 1 } },
    },
  ],
};

// Framer Motion will be automatically added to package.json
```

### Pattern 3: With Routing

```typescript
const components = [
  {
    name: 'Home',
    code: 'function Home() { return <div>Home</div> }',
    dependencies: ['react'],
  },
  {
    name: 'About',
    code: `
      import { useNavigate } from 'react-router-dom';
      function About() {
        const navigate = useNavigate();
        return <div onClick={() => navigate('/')}>About</div>
      }
    `,
    dependencies: ['react', 'react-router-dom'],
  },
];

// react-router-dom will be automatically detected and added
```

### Pattern 4: With State Management

```typescript
const components = [
  {
    name: 'Counter',
    code: `
      import { create } from 'zustand';

      const useStore = create((set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      }));

      function Counter() {
        const { count, increment } = useStore();
        return <button onClick={increment}>{count}</button>
      }
    `,
    dependencies: ['react', 'zustand'],
  },
];

// zustand will be automatically detected and added
```

## Testing Your Generation

```bash
# Run the test suite
npm run test

# Run examples
npm run test:example
```

## Validation

Always validate the output directory first:

```typescript
import { validateOutputDirectory } from './src/generator';

// Check if directory is safe to use
await validateOutputDirectory('./output', false);

// Or force overwrite
await validateOutputDirectory('./output', true);
```

## Checking Results

After generation, verify:

```bash
cd output-directory

# Check structure
ls -la

# Check package.json
cat package.json

# Check components
ls src/components/

# Install and run
npm install
npm run dev
```

## Common Issues

### Issue: "Directory not empty"
**Solution:** Use force option or clean the directory
```typescript
await validateOutputDirectory(dir, true);  // Force
```

### Issue: Missing dependencies
**Solution:** Dependencies are auto-detected. If missing, add manually:
```typescript
// Edit generated package.json
{
  "dependencies": {
    "your-missing-package": "^1.0.0"
  }
}
```

### Issue: Components not rendering
**Solution:** Check App.tsx imports
```typescript
// src/App.tsx should have:
import { YourComponent } from './components';
```

### Issue: Styles not applying
**Solution:** Check tailwind.config.js content array
```javascript
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",  // Must include all files
],
```

## Next Steps

1. **Customize the generated project**
   - Edit `tailwind.config.js` for custom theme
   - Add more components to `src/components/`
   - Modify `App.tsx` layout

2. **Add features**
   - Install additional packages
   - Add routing with React Router
   - Add state management

3. **Deploy**
   ```bash
   npm run build
   # Deploy the 'dist' folder
   ```

## API Quick Reference

```typescript
// Main function
generateProject(
  outputDir: string,
  components: DetectedComponent[],
  styles: ProcessedStyles,
  animations: AnimationResult,
  assets: Asset[],
  options?: GeneratorOptions
): Promise<void>

// Validation
validateOutputDirectory(dir: string, force?: boolean): Promise<void>
isDirectoryEmpty(dir: string): Promise<boolean>

// Individual steps (if you need fine-grained control)
createViteProject(outputDir: string): Promise<void>
generatePackageJson(components, animations): string
writeComponents(outputDir, components, styles): Promise<void>
```

## Full Example Script

Save as `generate-site.ts`:

```typescript
import { generateProject } from './src/generator';

const components = [
  {
    name: 'App',
    code: `
      function App() {
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                My Generated Site
              </h1>
              <p className="text-gray-600">
                This site was generated automatically!
              </p>
            </div>
          </div>
        );
      }
      export default App;
    `,
    dependencies: ['react'],
  },
];

const styles = {
  classMap: {},
  colors: { primary: '#3b82f6' },
};

const animations = { library: 'none', animations: [] };

generateProject('./generated-site', components, styles, animations, [])
  .then(() => console.log('Success!'))
  .catch(console.error);
```

Run it:
```bash
npx tsx generate-site.ts
```

## Resources

- [Full Documentation](./GENERATOR_DOCS.md)
- [Examples](./example.ts)
- [Tests](./test.ts)
- [README](./README.md)

## Support

For issues, check:
1. Generated project's README.md
2. This documentation
3. Test files for examples
