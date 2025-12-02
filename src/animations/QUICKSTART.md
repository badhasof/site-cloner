# Animations Module - Quick Start Guide

## Installation

```bash
cd site-cloner
npm install playwright framer-motion
```

## Basic Usage (5 minutes)

### 1. Simple Animation Extraction

```typescript
import { chromium } from 'playwright';
import { extractAnimations } from './animations';

async function extract() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');

  // Get styles
  const styles = {
    css: await page.evaluate(() =>
      Array.from(document.styleSheets)
        .map(s => {
          try {
            return Array.from(s.cssRules).map(r => r.cssText).join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n')
    )
  };

  // Extract animations
  const result = await extractAnimations(page, styles);

  console.log(`Found ${result.animations.length} animations!`);
  console.log('\nFramer Motion code:');
  console.log(result.framerMotionCode);

  await browser.close();
}

extract();
```

### 2. Save to File

```typescript
import fs from 'fs/promises';

// After extracting...
await fs.writeFile('animations.tsx', result.framerMotionCode);
await fs.writeFile('animations.json', JSON.stringify(result, null, 2));
```

### 3. Use Generated Code

Copy the generated code into your React app:

```tsx
// animations.tsx (generated)
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
>
  Your content here
</motion.div>
```

## Common Patterns

### Pattern 1: Extract Specific Element Animations

```typescript
const heroAnimations = result.animations.filter(a =>
  a.selector.includes('hero')
);
```

### Pattern 2: Analyze Performance

```typescript
import { analyzeAnimationPerformance } from './animations';

const analysis = analyzeAnimationPerformance(result.animations);
console.log('Warnings:', analysis.warnings);
```

### Pattern 3: Group by Type

```typescript
const scrollAnims = result.animations.filter(a => a.type === 'scroll');
const hoverAnims = result.animations.filter(a => a.type === 'hover');
```

## Key Functions

| Function | Purpose |
|----------|---------|
| `extractAnimations(page, styles)` | Extract all animations |
| `captureRuntimeAnimations(page)` | CDP-based capture only |
| `detectScrollAnimations(page)` | Scroll animations only |
| `generateFramerMotionCode(animation)` | Convert to code |

## Animation Types Captured

- ✓ CSS `@keyframes` animations
- ✓ CSS transitions
- ✓ Scroll-triggered animations
- ✓ Hover effects
- ✓ Click animations
- ✓ Viewport entry animations
- ✓ Web Animations API
- ✓ AOS, GSAP, Locomotive Scroll

## Output Format

```typescript
{
  animations: [
    {
      id: "scroll-section-1",
      type: "viewport",
      selector: "section.hero",
      keyframes: [
        { offset: 0, properties: { opacity: 0, y: 50 } },
        { offset: 1, properties: { opacity: 1, y: 0 } }
      ],
      timing: {
        duration: 600,
        easing: "ease-out"
      }
    }
  ],
  framerMotionCode: "...",
  cssAnimations: [...],
  scrollAnimations: [...]
}
```

## Troubleshooting

**Problem:** No animations found
- Check if site actually has animations
- Verify CSS is loaded: `console.log(styles.css.length)`
- Try scrolling page manually first

**Problem:** CORS errors
- Some stylesheets can't be read due to CORS
- These will be skipped automatically

**Problem:** Slow extraction
- Reduce elements: Pass `maxElements` option
- Skip scroll detection for testing

## Next Steps

1. Read [README.md](./README.md) for full documentation
2. Check [example.ts](./example.ts) for more patterns
3. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for technical details

## Support

For issues or questions, check:
- Type definitions: `src/types/animations.ts`
- Module docs: `src/animations/README.md`
- Examples: `src/animations/example.ts`
