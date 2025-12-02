# Styler Module - Technical Overview

## Purpose

The Styler module is responsible for converting extracted CSS from websites into Tailwind CSS utility classes and generating a complete Tailwind configuration. It serves as the styling layer in the site-cloner pipeline.

## Architecture

### Module Structure

```
src/styler/
├── index.ts              # Main orchestration & public API
├── cssParser.ts          # CSS parsing using css-tree
├── tailwindMapper.ts     # CSS-to-Tailwind conversion logic
├── configGenerator.ts    # tailwind.config.js generation
├── types.ts              # TypeScript type definitions
├── example.ts            # Usage examples
├── test.ts               # Unit tests
├── README.md            # User documentation
└── OVERVIEW.md          # This file
```

### Data Flow

```
ExtractedStyles (from scraper)
    ↓
parseCSS() → ParsedCSS
    ↓
processRules() → Map<selector, TailwindClass[]>
    ↓
generateTailwindConfig() → TailwindConfig
    ↓
ProcessedStyles
```

## Core Components

### 1. CSS Parser (`cssParser.ts`)

**Purpose:** Parse CSS strings into structured AST using `css-tree`

**Key Functions:**
- `parseCSS(css: string): ParsedCSS`
- `mergeParsedCSS(parsedCSSArray: ParsedCSS[]): ParsedCSS`

**Features:**
- Selector specificity calculation
- Pseudo-class extraction (`:hover`, `:focus`, etc.)
- `@keyframes` animation parsing
- `@font-face` declaration extraction
- CSS custom properties (variables) extraction
- `@media` query parsing
- Error-tolerant parsing

**Algorithm Details:**

```typescript
Specificity Calculation:
- ID selectors (#id): 100 points
- Class/attribute/pseudo-class: 10 points each
- Element selectors: 1 point each

Example:
  div.container#main:hover
  = 1 (div) + 10 (.container) + 100 (#main) + 10 (:hover)
  = 121
```

### 2. Tailwind Mapper (`tailwindMapper.ts`)

**Purpose:** Convert CSS property-value pairs to Tailwind utility classes

**Key Functions:**
- `mapToTailwind(cssProperties, pseudoClass?): string`
- `convertCSSToTailwind(css: string): string`

**Mapping Strategy:**

1. **Direct Mappings:** Standard values → Tailwind classes
   ```
   display: flex → flex
   position: absolute → absolute
   ```

2. **Spacing Conversion:** px → rem-based Tailwind scale
   ```
   margin: 16px → m-4
   padding: 32px → p-8
   ```

3. **Arbitrary Values:** Non-standard values → `[value]` syntax
   ```
   width: 350px → w-[350px]
   color: #1a73e8 → text-[#1a73e8]
   ```

4. **Pseudo-class Variants:**
   ```
   :hover { color: red } → hover:text-red-500
   ```

5. **Responsive Variants:**
   ```
   @media (min-width: 768px) → md:*
   ```

**Supported Properties:**

| Category | Properties |
|----------|-----------|
| Layout | display, position, top, right, bottom, left, z-index |
| Flexbox | flex-direction, justify-content, align-items, gap |
| Grid | grid-template-columns, grid-template-rows, grid-column |
| Spacing | margin, padding (all directions) |
| Sizing | width, height, min-*, max-* |
| Typography | font-size, font-weight, line-height, text-align |
| Colors | color, background-color, border-color |
| Borders | border-width, border-radius, border-style |
| Effects | box-shadow, opacity, transform, transition |

### 3. Config Generator (`configGenerator.ts`)

**Purpose:** Generate `tailwind.config.js` with custom theme values

**Key Functions:**
- `generateTailwindConfig(parsedCSS: ParsedCSS): TailwindConfig`
- `generateConfigFile(parsedCSS: ParsedCSS): string`
- `configToString(config: TailwindConfig): string`

**Extraction Logic:**

```typescript
1. Colors:
   - Extract from color/background-color/border-color
   - Extract from CSS custom properties
   - Generate unique color names

2. Font Families:
   - Extract from @font-face rules
   - Extract from font-family declarations
   - Filter out generic families

3. Spacing:
   - Extract non-standard spacing values
   - Generate custom spacing scale

4. Animations:
   - Convert @keyframes to Tailwind keyframes format
   - Extract animation properties
   - Generate animation utilities

5. Other:
   - Border radius
   - Box shadows
   - Custom properties
```

### 4. Main Orchestrator (`index.ts`)

**Purpose:** Coordinate all components and provide public API

**Key Functions:**
- `processStyles(styles: ExtractedStyles): Promise<ProcessedStyles>`
- `generateTailwindConfigFile(processedStyles: ProcessedStyles): string`

**Processing Pipeline:**

```
1. Parse all CSS sources (external stylesheets, inline styles)
2. Merge parsed CSS objects
3. Generate Tailwind config from merged CSS
4. Process rules → generate class mappings
5. Convert keyframes → animation definitions
6. Generate custom CSS (fonts, variables, complex rules)
7. Return ProcessedStyles with all data
```

## Type System

### Core Types

```typescript
// Input from scraper
interface ExtractedStyles {
  externalStylesheets: Array<{ url: string; content: string }>;
  inlineStyles: string[];
  computedStyles: Map<string, Record<string, string>>;
  rules: CSSRule[];
  keyframes: string[];
}

// Parsed CSS structure
interface ParsedCSS {
  rules: ParsedCSSRule[];
  keyframes: ParsedKeyframe[];
  fontFaces: FontFace[];
  customProperties: CustomProperty[];
  mediaQueries: MediaQuery[];
}

// Output to generator
interface ProcessedStyles {
  classMap: Map<string, TailwindClass[]>;
  tailwindClasses: string[];
  customCSS: string;
  cssVariables: Record<string, string>;
  mappings: TailwindMapping[];
  config: TailwindConfig;
  animations: AnimationDefinition[];
}
```

## Implementation Details

### Specificity Handling

Rules are sorted by specificity to maintain CSS cascading:

```typescript
merged.rules.sort((a, b) => (a.specificity || 0) - (b.specificity || 0));
```

This ensures that more specific rules override less specific ones.

### Media Query Mapping

Standard breakpoints are detected:

```typescript
const breakpoints: Record<string, RegExp> = {
  sm: /min-width:\s*640px/,
  md: /min-width:\s*768px/,
  lg: /min-width:\s*1024px/,
  xl: /min-width:\s*1280px/,
  '2xl': /min-width:\s*1536px/,
};
```

Custom media queries are preserved in custom CSS.

### Pseudo-class Support

Supported pseudo-classes:
- `:hover`
- `:focus`
- `:active`
- `:visited`
- `:focus-within`
- `:focus-visible`
- `:disabled`
- `:enabled`
- `:checked`
- `:invalid`
- `:valid`
- `:required`
- `:optional`
- `:first-child`
- `:last-child`
- `:nth-child(*)`
- `:nth-of-type(*)`

### Error Handling

The parser is error-tolerant:

```typescript
try {
  const ast = csstree.parse(css, { ... });
  // Process AST
} catch (error) {
  console.error('Error parsing CSS:', error);
  return {
    rules: [],
    keyframes: [],
    // ... empty structure
  };
}
```

Invalid CSS returns empty structures instead of crashing.

## Performance Considerations

### Optimization Strategies

1. **AST-based Parsing:** Uses `css-tree` for efficient parsing
2. **Deduplication:** Removes duplicate classes using `Set`
3. **Specificity Caching:** Pre-calculates and stores specificity
4. **Lazy Evaluation:** Only processes needed properties

### Memory Management

- Uses `Map` for O(1) lookups
- Streams large CSS files
- Clears intermediate data structures

## Integration Points

### Input Interface

```typescript
// From scraper module
const extractedStyles: ExtractedStyles = await scrapeWebsite(url);
```

### Output Interface

```typescript
// To generator module
const processed = await processStyles(extractedStyles);

// Use in component generation
const className = processed.classMap.get('.button')
  .map(c => c.className)
  .join(' ');
```

## Testing

### Unit Tests (`test.ts`)

Tests cover:
1. CSS Parser functionality
2. Tailwind Mapper conversions
3. Config Generator output
4. CSS Merging logic
5. Edge cases (empty CSS, invalid syntax, complex selectors)

### Example Usage (`example.ts`)

Demonstrates:
- Complete workflow
- All module features
- Expected outputs
- Error handling

## Dependencies

### Required Packages

```json
{
  "css-tree": "^2.3.1",        // CSS parsing
  "css-to-tailwindcss": "^1.0.0", // CSS conversion
  "postcss": "^8.4.32"         // CSS utilities
}
```

### Type Dependencies

```json
{
  "@types/node": "^20.10.6"
}
```

## Known Limitations

1. **Complex Selectors:** Some advanced CSS selectors may not map perfectly to Tailwind
2. **Dynamic Values:** `calc()`, `var()`, etc. use arbitrary values
3. **Vendor Prefixes:** `-webkit-`, `-moz-` properties use arbitrary values
4. **Advanced CSS:** `@supports`, `@container` preserved in custom CSS
5. **CSS-in-JS:** Only handles extracted CSS, not runtime styles

## Future Enhancements

### Planned Features

1. **Enhanced Color Extraction:** Smart color grouping and naming
2. **Component Class Detection:** Identify reusable class patterns
3. **Optimization:** Remove unused classes
4. **Source Maps:** Track original CSS locations
5. **CSS Variables:** Better handling of `var()` references
6. **Grid Support:** Enhanced CSS Grid mapping
7. **Custom Plugins:** Support for Tailwind plugins

### API Extensions

```typescript
// Future options
interface StyleProcessingOptions {
  preserveCustomProperties?: boolean;
  generateArbitraryValues?: boolean;
  minifyOutput?: boolean;
  includeComments?: boolean;
  optimizeClasses?: boolean;
  detectComponents?: boolean;
}
```

## Contributing Guidelines

When extending this module:

1. **Maintain Type Safety:** Use strict TypeScript types
2. **Add Tests:** Cover new functionality in `test.ts`
3. **Update Documentation:** Keep README and OVERVIEW in sync
4. **Follow Patterns:** Use existing code structure
5. **Error Handling:** Always handle parse errors gracefully
6. **Performance:** Consider impact on large stylesheets

## References

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [css-tree Documentation](https://github.com/csstree/csstree)
- [CSS Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
