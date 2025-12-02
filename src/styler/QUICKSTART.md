# Styler Module - Quick Start Guide

## Installation

The dependencies are already included in the site-cloner project:

```json
{
  "css-tree": "^2.3.1",
  "css-to-tailwindcss": "^1.0.0",
  "postcss": "^8.4.32"
}
```

## Basic Usage

### 1. Process Extracted Styles

```typescript
import { processStyles } from './styler';

// Get styles from scraper
const extractedStyles = {
  externalStylesheets: [
    { url: 'styles.css', content: '.button { padding: 10px; }' }
  ],
  inlineStyles: ['.card { background: white; }'],
  rules: [],
  keyframes: [],
  computedStyles: new Map(),
};

// Process styles
const processed = await processStyles(extractedStyles);

// Use the results
console.log(processed.tailwindClasses);
// ['p-2.5', 'bg-white']
```

### 2. Generate Tailwind Config

```typescript
import { generateTailwindConfigFile } from './styler';
import fs from 'fs/promises';

// Generate config file content
const configContent = generateTailwindConfigFile(processed);

// Save to file
await fs.writeFile('tailwind.config.js', configContent);
```

### 3. Use Class Mappings

```typescript
// Get Tailwind classes for a selector
const buttonClasses = processed.classMap.get('.button');

// Convert to string
const className = buttonClasses
  .map(c => {
    let cls = c.className;
    if (c.variant) cls = `${c.variant}:${cls}`;
    if (c.important) cls = `!${cls}`;
    return cls;
  })
  .join(' ');

console.log(className);
// 'flex items-center p-2.5 bg-blue-500 rounded-lg hover:bg-blue-600'
```

## Run Examples

### Test the Module

```bash
# Run unit tests
npx tsx src/styler/test.ts

# Run example
npx tsx src/styler/example.ts
```

### Expected Output

```
=== Styler Module Example ===

Processing styles...

✓ Styles processed successfully!

=== Generated Tailwind Classes ===
Total unique classes: 45

Sample classes:
  max-w-[1200px]
  mx-auto
  p-5
  flex
  items-center
  ...
```

## Common Use Cases

### Use Case 1: Convert Single CSS Rule

```typescript
import { parseCSS } from './styler/cssParser';
import { mapToTailwind } from './styler/tailwindMapper';

const css = '.button { display: flex; padding: 12px 24px; }';
const parsed = parseCSS(css);
const rule = parsed.rules[0];

// Convert declarations to properties object
const properties = {};
rule.declarations.forEach(d => {
  properties[d.property] = d.value;
});

const tailwindClasses = mapToTailwind(properties);
console.log(tailwindClasses);
// 'flex py-3 px-6'
```

### Use Case 2: Extract Colors for Theme

```typescript
import { generateTailwindConfig } from './styler/configGenerator';

const config = generateTailwindConfig(parsedCSS);

// Access extracted colors
const colors = config.theme.extend.colors;
console.log(colors);
// { color_3b82f6: '#3b82f6', color_2563eb: '#2563eb', ... }
```

### Use Case 3: Handle Animations

```typescript
// Animations are automatically extracted
processed.animations.forEach(anim => {
  console.log(`${anim.name}: ${anim.duration} ${anim.timingFunction}`);
});

// Keyframes are in the config
const keyframes = processed.config.theme.extend.keyframes;
// Use in Tailwind: animate-fadeIn
```

## Integration with Site-Cloner

### Full Pipeline

```typescript
// 1. Scrape website
import { scrapeWebsite } from './scraper';
const scraped = await scrapeWebsite('https://example.com');

// 2. Process styles
import { processStyles } from './styler';
const processed = await processStyles(scraped.styles);

// 3. Generate components
import { generateComponents } from './generator';
const components = await generateComponents(scraped.html, processed);

// 4. Output project
import { writeProject } from './writer';
await writeProject('./output', {
  components,
  config: processed.config,
  customCSS: processed.customCSS,
});
```

## Troubleshooting

### Issue: Classes Not Mapping

```typescript
// Check if CSS was parsed correctly
const parsed = parseCSS(css);
console.log(parsed.rules.length); // Should be > 0

// Check mapping output
const mapped = mapToTailwind(properties);
console.log(mapped); // Check for empty string
```

### Issue: Config Not Generating

```typescript
// Verify parsed CSS has extractable values
console.log(parsed.keyframes.length);
console.log(parsed.fontFaces.length);
console.log(parsed.customProperties.length);
```

### Issue: Invalid CSS

```typescript
// Parser handles errors gracefully
const parsed = parseCSS('invalid { css'); // Returns empty structure
console.log(parsed.rules); // []
```

## Next Steps

1. Read the [README](./README.md) for detailed API documentation
2. Check [OVERVIEW](./OVERVIEW.md) for technical architecture
3. Run [example.ts](./example.ts) to see complete workflow
4. Run [test.ts](./test.ts) to verify functionality

## API Reference

### Main Functions

```typescript
// Process styles (main entry point)
processStyles(styles: ExtractedStyles): Promise<ProcessedStyles>

// Generate config file
generateTailwindConfigFile(processed: ProcessedStyles): string

// Parse CSS
parseCSS(css: string): ParsedCSS

// Map to Tailwind
mapToTailwind(properties: Record<string, string>, pseudoClass?: string): string

// Generate config
generateTailwindConfig(parsed: ParsedCSS): TailwindConfig
```

### Types

```typescript
import type {
  ExtractedStyles,
  ProcessedStyles,
  ParsedCSS,
  TailwindClass,
  TailwindConfig,
  AnimationDefinition,
} from './styler';
```

## Tips

1. **Performance:** Process large stylesheets in chunks
2. **Caching:** Cache parsed CSS for repeated conversions
3. **Custom Values:** Use arbitrary values for unique designs
4. **Specificity:** Trust the automatic specificity handling
5. **Testing:** Validate output with Tailwind CLI

## Support

For issues or questions:
1. Check the documentation files in this directory
2. Run the test suite to verify functionality
3. Review the example file for usage patterns
