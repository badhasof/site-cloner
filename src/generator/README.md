# Generator Module

The generator module is responsible for creating a complete Vite + React + Tailwind project from processed site data.

## Overview

The generator takes detected components, processed styles, animations, and assets, and creates a fully functional React application with:

- Vite build configuration
- TypeScript support
- Tailwind CSS with custom theme
- All detected components
- Asset management
- Package.json with auto-detected dependencies

## Main Files

### index.ts

Main orchestration file that coordinates the entire generation process.

```typescript
import { generateProject } from './generator';

await generateProject(
  './output',
  components,
  styles,
  animations,
  assets
);
```

### viteScaffold.ts

Creates the base Vite project structure including:
- Directory structure (src/, public/, etc.)
- Configuration files (vite.config.ts, tsconfig.json)
- Base template files (index.html, main.tsx, etc.)
- Initial CSS with Tailwind directives

### packageBuilder.ts

Intelligently generates package.json by:
- Detecting used libraries from component code
- Adding appropriate versions
- Including necessary dev dependencies
- Setting up scripts (dev, build, preview)

**Detection patterns:**
- Animation libraries (framer-motion, gsap)
- UI libraries (@headlessui/react, @radix-ui)
- Icons (lucide-react, react-icons)
- State management (zustand, redux)
- Routing (react-router-dom)
- Forms (react-hook-form, formik)
- And many more...

### componentWriter.ts

Handles writing component files:
- Sorts components by dependencies
- Enhances code with proper imports
- Applies Tailwind classes from style mapping
- Formats code consistently
- Creates component index file

Also includes utilities for writing:
- Custom hooks (`writeHooks`)
- Utility functions (`writeUtilities`)

### assetDownloader.ts

Downloads and manages assets:
- Downloads images, fonts, videos, icons
- Handles retries and concurrent downloads
- Normalizes asset paths
- Organizes assets by type

### templateCopier.ts

Utilities for copying template files with variable replacement.

### codeFormatter.ts

Basic code formatting utilities:
- Indentation
- Quote style normalization
- Import sorting
- Semicolon handling
- JSX formatting

## Usage Example

```typescript
import {
  generateProject,
  validateOutputDirectory,
} from './generator';

// Validate output directory
await validateOutputDirectory('./my-cloned-site', false);

// Generate project
await generateProject(
  './my-cloned-site',
  [
    {
      name: 'Header',
      code: 'function Header() { return <header>...</header> }',
      dependencies: ['react'],
      hooks: ['useState'],
    },
    {
      name: 'Footer',
      code: 'function Footer() { return <footer>...</footer> }',
      dependencies: ['react'],
    },
  ],
  {
    classMap: {
      '.header': ['bg-blue-500', 'text-white', 'p-4'],
      '.footer': ['bg-gray-800', 'text-gray-300', 'p-8'],
    },
    colors: {
      primary: '#3b82f6',
      secondary: '#1f2937',
    },
    fonts: [
      {
        family: 'Inter',
        url: 'https://fonts.googleapis.com/css2?family=Inter',
      },
    ],
  },
  {
    library: 'framer-motion',
    animations: [
      {
        type: 'fadeIn',
        target: '.header',
        properties: { opacity: [0, 1] },
      },
    ],
  },
  [
    {
      type: 'image',
      url: 'https://example.com/logo.png',
      localPath: 'images/logo.png',
    },
  ]
);

console.log('Project generated! Run:');
console.log('  cd my-cloned-site');
console.log('  npm install');
console.log('  npm run dev');
```

## Generated Project Structure

```
output-dir/
├── public/
│   ├── images/          # Downloaded images
│   └── fonts/           # Downloaded fonts
├── src/
│   ├── components/      # All React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── index.ts     # Component exports
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app with all components
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind + custom CSS
├── index.html           # HTML template
├── package.json         # Dependencies + scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind with custom theme
├── postcss.config.js    # PostCSS config
├── tsconfig.json        # TypeScript config
└── README.md            # Generated readme
```

## Configuration Options

```typescript
interface GeneratorOptions {
  typescript?: boolean;      // Use TypeScript (default: true)
  useClientComponents?: boolean;  // Next.js client components
  includeTests?: boolean;    // Generate test files
}
```

## Dependency Detection

The package builder automatically detects and includes dependencies based on code patterns:

| Pattern | Package |
|---------|---------|
| `motion.`, `from 'framer-motion'` | framer-motion |
| `gsap`, `TweenMax` | gsap |
| `useNavigate`, `<Routes` | react-router-dom |
| `useForm` (from react-hook-form) | react-hook-form |
| `z.object`, `zod` | zod |
| `axios` | axios |
| `useSWR` | swr |
| `useQuery` (tanstack) | @tanstack/react-query |
| `clsx` | clsx |
| `twMerge` | tailwind-merge |
| Icon imports | lucide-react, react-icons, @heroicons/react |

And many more...

## Asset Handling

Assets are:
1. Downloaded concurrently with retry logic
2. Organized by type (images/, fonts/, etc.)
3. Normalized to clean filenames
4. Referenced correctly in generated code

## Error Handling

The generator includes error handling for:
- Invalid output directories
- Missing dependencies
- Failed asset downloads
- Component dependency cycles

## Future Enhancements

- [ ] Prettier integration for better formatting
- [ ] ESLint configuration
- [ ] Test file generation
- [ ] Storybook integration
- [ ] Image optimization with Sharp
- [ ] Bundle size analysis
- [ ] Performance optimization suggestions
