# Styler Module

The Styler module converts extracted CSS from websites into Tailwind CSS utility classes and generates a complete Tailwind configuration file.

## Features

- Parse CSS using `css-tree` for robust AST-based parsing
- Convert CSS properties to Tailwind utility classes
- Generate `tailwind.config.js` with custom theme values
- Extract and preserve:
  - CSS animations (`@keyframes`)
  - Font faces (`@font-face`)
  - CSS custom properties (CSS variables)
  - Media queries (responsive breakpoints)
  - Pseudo-classes (`:hover`, `:focus`, etc.)
- Handle CSS specificity and cascading correctly
- Generate custom CSS for properties that can't be mapped to Tailwind

## Architecture

```
src/styler/
├── index.ts              # Main orchestration
├── cssParser.ts          # CSS parsing using css-tree
├── tailwindMapper.ts     # CSS to Tailwind conversion
├── configGenerator.ts    # tailwind.config.js generation
├── types.ts              # TypeScript type definitions
└── README.md            # This file
```

## Usage

### Basic Usage

```typescript
import { processStyles } from './styler';
import { ExtractedStyles } from './types';

// ExtractedStyles from the scraper module
const extractedStyles: ExtractedStyles = {
  externalStylesheets: [
    {
      url: 'https://example.com/styles.css',
      content: '.button { background: blue; padding: 10px; }',
    },
  ],
  inlineStyles: [
    '.header { display: flex; justify-content: center; }',
  ],
  computedStyles: new Map(),
  rules: [],
  keyframes: [],
};

// Process the styles
const processedStyles = await processStyles(extractedStyles);

console.log(processedStyles.tailwindClasses);
// ['bg-blue-500', 'p-2.5', 'flex', 'justify-center']

console.log(processedStyles.config);
// { theme: { extend: { ... } } }
```

### Generating tailwind.config.js

```typescript
import { generateTailwindConfigFile } from './styler';

const configContent = generateTailwindConfigFile(processedStyles);

// Write to file
import fs from 'fs/promises';
await fs.writeFile('tailwind.config.js', configContent);
```

### Using Individual Modules

#### CSS Parser

```typescript
import { parseCSS } from './styler/cssParser';

const css = `
  .button {
    background-color: #3b82f6;
    padding: 10px 20px;
    border-radius: 8px;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const parsed = parseCSS(css);

console.log(parsed.rules);
// [{ selector: '.button', declarations: [...], specificity: 10 }]

console.log(parsed.keyframes);
// [{ name: 'fadeIn', steps: [...] }]
```

#### Tailwind Mapper

```typescript
import { mapToTailwind } from './styler/tailwindMapper';

const cssProperties = {
  'background-color': '#3b82f6',
  padding: '10px 20px',
  'border-radius': '8px',
};

const tailwindClasses = mapToTailwind(cssProperties);
console.log(tailwindClasses);
// 'bg-[#3b82f6] py-2.5 px-5 rounded-lg'

// With pseudo-class
const hoverClasses = mapToTailwind(
  { 'background-color': '#2563eb' },
  'hover'
);
console.log(hoverClasses);
// 'hover:bg-[#2563eb]'
```

#### Config Generator

```typescript
import { generateTailwindConfig } from './styler/configGenerator';

const config = generateTailwindConfig(parsedCSS);

console.log(config);
// {
//   theme: {
//     extend: {
//       colors: { ... },
//       fontFamily: { ... },
//       animation: { ... },
//       keyframes: { ... }
//     }
//   }
// }
```

## CSS Property Mapping

The module maps CSS properties to Tailwind classes with the following strategy:

### Direct Mappings

Standard CSS values map directly to Tailwind classes:

| CSS Property | CSS Value | Tailwind Class |
|--------------|-----------|----------------|
| `display` | `flex` | `flex` |
| `position` | `absolute` | `absolute` |
| `font-weight` | `700` | `font-bold` |
| `text-align` | `center` | `text-center` |

### Spacing (px → rem)

Pixel values are converted to Tailwind's rem-based spacing scale:

| CSS Value | Tailwind Class |
|-----------|----------------|
| `0px` | `*-0` |
| `4px` | `*-1` |
| `8px` | `*-2` |
| `16px` | `*-4` |
| `32px` | `*-8` |

### Arbitrary Values

Values without direct Tailwind equivalents use arbitrary value syntax:

| CSS | Tailwind |
|-----|----------|
| `width: 350px` | `w-[350px]` |
| `color: #1a73e8` | `text-[#1a73e8]` |
| `line-height: 1.6` | `leading-[1.6]` |

### Pseudo-Classes

Pseudo-classes are preserved as Tailwind variants:

| CSS | Tailwind |
|-----|----------|
| `.btn:hover { color: red }` | `hover:text-red-500` |
| `.input:focus { outline: blue }` | `focus:outline-[blue]` |
| `.link:active { color: purple }` | `active:text-[purple]` |

### Media Queries

Media queries map to responsive breakpoints:

| CSS | Tailwind |
|-----|----------|
| `@media (min-width: 640px)` | `sm:*` |
| `@media (min-width: 768px)` | `md:*` |
| `@media (min-width: 1024px)` | `lg:*` |
| `@media (min-width: 1280px)` | `xl:*` |

## Output Structure

### ProcessedStyles

```typescript
interface ProcessedStyles {
  // Map of selector → Tailwind classes
  classMap: Map<string, TailwindClass[]>;

  // Flat array of all Tailwind classes
  tailwindClasses: string[];

  // CSS that couldn't be converted (fonts, variables, complex rules)
  customCSS: string;

  // Extracted CSS custom properties
  cssVariables: Record<string, string>;

  // Mappings with confidence scores
  mappings: TailwindMapping[];

  // Complete Tailwind config object
  config: TailwindConfig;

  // Extracted animations
  animations: AnimationDefinition[];
}
```

### TailwindConfig

```typescript
interface TailwindConfig {
  theme: {
    extend: {
      colors?: Record<string, string>;
      fontFamily?: Record<string, string[]>;
      fontSize?: Record<string, [string, { lineHeight: string }]>;
      spacing?: Record<string, string>;
      borderRadius?: Record<string, string>;
      boxShadow?: Record<string, string>;
      animation?: Record<string, string>;
      keyframes?: Record<string, Record<string, Record<string, string>>>;
    };
  };
  plugins?: string[];
  safelist?: string[];
}
```

## Example: Complete Workflow

```typescript
import { processStyles, generateTailwindConfigFile } from './styler';
import fs from 'fs/promises';

// 1. Get extracted styles from scraper
const extractedStyles = await scrapeWebsite('https://example.com');

// 2. Process styles
const processed = await processStyles(extractedStyles);

// 3. Generate Tailwind config
const configContent = generateTailwindConfigFile(processed);
await fs.writeFile('tailwind.config.js', configContent);

// 4. Save custom CSS (fonts, variables, animations)
if (processed.customCSS) {
  await fs.writeFile('src/styles/custom.css', processed.customCSS);
}

// 5. Use class mappings in component generation
processed.classMap.forEach((classes, selector) => {
  const classString = classes
    .map(c => {
      let cls = c.className;
      if (c.variant) cls = `${c.variant}:${cls}`;
      if (c.important) cls = `!${cls}`;
      return cls;
    })
    .join(' ');

  console.log(`${selector} → ${classString}`);
});
```

## CSS Specificity Handling

The parser calculates CSS specificity for proper rule ordering:

- ID selectors (`#id`): 100 points
- Class selectors (`.class`), attributes (`[attr]`), pseudo-classes (`:hover`): 10 points each
- Element selectors (`div`, `h1`): 1 point each

Rules are sorted by specificity to maintain correct CSS cascading behavior.

## Limitations

1. **Complex Selectors**: Some complex CSS selectors may not have direct Tailwind equivalents
2. **Browser-Specific Properties**: Vendor-prefixed properties use arbitrary values
3. **Advanced CSS Features**: Features like `@supports` or `@container` are preserved in custom CSS
4. **Dynamic Values**: `calc()`, `var()`, and other CSS functions use arbitrary values

## Dependencies

- `css-tree` (v2.3.1): CSS parsing and AST manipulation
- `css-to-tailwindcss` (v1.0.0): CSS to Tailwind conversion
- `postcss` (v8.4.32): CSS processing utilities

## Type Definitions

All types are defined in `types.ts` and exported from the main module:

```typescript
import type {
  ParsedCSS,
  TailwindClass,
  TailwindConfig,
  AnimationDefinition,
  // ... more types
} from './styler';
```
