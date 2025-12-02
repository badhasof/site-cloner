# Animations Module

Complete animation extraction and reconstruction module for site-cloner. Captures all types of animations from websites and converts them to Framer Motion code.

## Overview

This module uses Chrome DevTools Protocol (CDP) and Playwright to capture, analyze, and recreate website animations. It supports:

- CSS animations (`@keyframes`)
- CSS transitions
- Web Animations API
- Scroll-triggered animations
- Intersection Observer animations
- Hover/click interactions
- Custom animation libraries (AOS, GSAP, Locomotive Scroll, etc.)

## Architecture

```
animations/
├── index.ts              # Main orchestration
├── capturer.ts           # CDP-based runtime animation capture
├── keyframeExtractor.ts  # CSS keyframe parsing & conversion
├── scrollDetector.ts     # Scroll animation detection
├── framerGenerator.ts    # Framer Motion code generation
└── README.md
```

## Usage

### Basic Animation Extraction

```typescript
import { extractAnimations } from './animations';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

// Extract styles (assumed to be done by styler module)
const styles = {
  css: await page.evaluate(() =>
    Array.from(document.styleSheets)
      .map(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'))
      .join('\n')
  )
};

// Extract all animations
const result = await extractAnimations(page, styles);

console.log(`Captured ${result.animations.length} animations`);
console.log('Framer Motion code:', result.framerMotionCode);
```

### Animation Result Structure

```typescript
interface AnimationResult {
  animations: CapturedAnimation[];      // All captured animations
  framerMotionCode: string;             // Generated Framer Motion JSX
  cssAnimations: KeyframeAnimation[];   // CSS @keyframes
  scrollAnimations: ScrollAnimation[];  // Scroll-triggered animations
}
```

## Modules

### 1. capturer.ts - Runtime Animation Capture

Captures animations at runtime using Chrome DevTools Protocol:

```typescript
import { captureRuntimeAnimations } from './animations/capturer';

const animations = await captureRuntimeAnimations(page);
```

**Features:**
- CDP Animation domain integration
- Web Animations API capture
- Hover state detection (hovers over interactive elements)
- Click animation capture (clicks buttons/interactive elements)
- Automatic deduplication

**How it works:**
1. Establishes CDP session: `await page.context().newCDPSession(page)`
2. Enables Animation domain: `await cdp.send('Animation.enable')`
3. Listens for 'Animation.animationStarted' events
4. Captures element states before/after interactions
5. Extracts keyframes via `element.getAnimations()`

### 2. keyframeExtractor.ts - CSS Animation Parsing

Extracts and converts CSS animations:

```typescript
import { extractKeyframesFromCSS, convertToFramerMotionVariant } from './animations/keyframeExtractor';

// Extract @keyframes from CSS
const keyframes = extractKeyframesFromCSS(css);

// Convert to Framer Motion
const variant = convertToFramerMotionVariant(keyframes[0], 1000, 'ease-out');
```

**Features:**
- Regex-based @keyframes extraction
- CSS property parsing (handles all CSS properties)
- Automatic camelCase conversion
- Transform parsing (translate, rotate, scale, skew)
- Easing function conversion
- Animation usage detection (finds where animations are applied)

**Conversion mappings:**
```javascript
CSS                    →  Framer Motion
--------------------------------------------
opacity: 0            →  opacity: 0
transform: translateY →  y: value
transform: scale      →  scale: value
ease-in-out           →  "easeInOut"
cubic-bezier(...)     →  [x1, y1, x2, y2]
```

### 3. scrollDetector.ts - Scroll Animation Detection

Detects viewport-triggered animations:

```typescript
import { detectScrollAnimations, detectIntersectionObserverAnimations } from './animations/scrollDetector';

// Scroll-based detection
const scrollAnims = await detectScrollAnimations(page);

// Intersection Observer detection
const ioAnims = await detectIntersectionObserverAnimations(page);
```

**How it works:**
1. Scrolls through page in increments (50% viewport height)
2. Captures element states at each scroll position
3. Detects state changes when elements enter viewport
4. Analyzes opacity, transform, position changes
5. Generates Framer Motion `whileInView` code

**Detected libraries:**
- AOS (Animate On Scroll)
- Locomotive Scroll
- ScrollMagic
- Custom Intersection Observer implementations

**Example output:**
```typescript
{
  type: 'viewport',
  trigger: {
    type: 'viewport',
    threshold: 0.1,
    margin: '-100px',
    once: true
  },
  beforeState: { opacity: 0, y: 30 },
  afterState: { opacity: 1, y: 0 }
}
```

### 4. framerGenerator.ts - Code Generation

Generates Framer Motion JSX:

```typescript
import { generateFramerMotionCode, generateComponentWithVariants } from './animations/framerGenerator';

// Generate inline animation
const code = generateFramerMotionCode(animation);

// Generate component with variants
const component = generateComponentWithVariants('FadeInSection', animation);
```

**Output examples:**

**Inline:**
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  {/* Content */}
</motion.div>
```

**With variants:**
```jsx
const FadeInSectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

export function FadeInSection() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={FadeInSectionVariants}
    >
      {/* Content */}
    </motion.div>
  );
}
```

**Scroll animation:**
```jsx
<motion.section
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  {/* Content */}
</motion.section>
```

**Hover animation:**
```jsx
<motion.button
  whileHover={{ scale: 1.05, backgroundColor: "#3b82f6" }}
  transition={{ duration: 0.3, ease: "ease" }}
>
  Hover me
</motion.button>
```

### 5. index.ts - Main Orchestration

Coordinates all modules:

```typescript
import { extractAnimations } from './animations';

const result = await extractAnimations(page, styles);
```

**Process flow:**
1. Extract CSS keyframes from stylesheets
2. Find animation usage in CSS
3. Capture runtime animations via CDP
4. Detect scroll animations by scrolling page
5. Detect Intersection Observer animations
6. Combine and deduplicate all animations
7. Generate Framer Motion code

## Animation Types

### Supported Animation Types

```typescript
type AnimationType =
  | 'css-animation'      // @keyframes animations
  | 'css-transition'     // CSS transitions
  | 'web-animation'      // Web Animations API
  | 'scroll'             // Scroll-based
  | 'hover'              // Hover interactions
  | 'click'              // Click interactions
  | 'viewport';          // Viewport entry
```

### Timing Properties

All animations capture comprehensive timing information:

```typescript
interface AnimationTiming {
  duration: number;              // milliseconds
  delay: number;                 // milliseconds
  iterations: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  easing: string;                // CSS easing or cubic-bezier
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
}
```

### Trigger Configuration

Scroll and viewport animations include trigger settings:

```typescript
interface AnimationTrigger {
  type: 'hover' | 'click' | 'scroll' | 'viewport' | 'load';
  threshold?: number;      // 0-1 for scroll/viewport
  margin?: string;         // e.g., "-100px"
  once?: boolean;          // trigger only once
}
```

## Advanced Features

### Animation Analysis

Analyze performance impact:

```typescript
import { analyzeAnimationPerformance } from './animations';

const analysis = analyzeAnimationPerformance(animations);

console.log(`Total: ${analysis.total}`);
console.log('By type:', analysis.byType);
console.log('Warnings:', analysis.warnings);
```

**Checks for:**
- Long duration animations (>5s)
- Infinite loops
- Layout-affecting properties (width, height, top, left)
- Recommends transform-based alternatives

### Grouping & Filtering

```typescript
import { groupAnimationsBySelector, extractAnimationsForElement } from './animations';

// Group by selector
const grouped = groupAnimationsBySelector(animations);

// Get animations for specific element
const elementAnims = await extractAnimationsForElement(page, '.hero-section', styles);
```

### Export Options

```typescript
import { exportAnimationsAsJSON } from './animations';

// Export as JSON for analysis
const json = exportAnimationsAsJSON(animations);
fs.writeFileSync('animations.json', json);
```

## Integration with ExtractedStyles

The module expects styles in this format:

```typescript
interface ExtractedStyles {
  css: string;                                 // Combined CSS
  computedStyles?: Map<string, CSSStyleDeclaration>;
  stylesheets?: string[];
}
```

You can get this from the page:

```typescript
const styles = {
  css: await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    return sheets
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');
  })
};
```

## Limitations & Notes

1. **CDP Access**: Requires Playwright with CDP enabled (Chromium only)
2. **Cross-origin styles**: CORS restrictions may prevent reading some stylesheets
3. **Dynamic animations**: JavaScript-based animations may not be fully captured
4. **Complex GSAP**: Advanced GSAP timelines may need manual adjustment
5. **Performance**: Scroll detection scrolls entire page (can be slow for long pages)

## Performance Optimization

For large pages:

```typescript
// Limit scroll animation detection
const elements = await getAnimatableElements(page);
const limitedElements = elements.slice(0, 20); // First 20 only

// Skip interaction capture for faster extraction
const animations = await captureWebAnimations(page); // Skip hover/click
```

## Dependencies

- `playwright` - Browser automation and CDP access
- `framer-motion` - Animation library (for generated code)

## Example: Complete Workflow

```typescript
import { chromium } from 'playwright';
import { extractAnimations, generateAnimationComponents } from './animations';

async function cloneAnimations(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle' });

  // Get styles
  const styles = {
    css: await page.evaluate(() =>
      Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n')
    )
  };

  // Extract animations
  const result = await extractAnimations(page, styles);

  // Generate components
  const components = generateAnimationComponents(result.animations);

  // Save output
  fs.writeFileSync('animations.tsx', components);
  fs.writeFileSync('animations.json', JSON.stringify(result, null, 2));

  await browser.close();

  console.log(`✓ Extracted ${result.animations.length} animations`);
  console.log(`✓ Generated Framer Motion components`);
  console.log(`✓ Detected triggers: ${detectAnimationTriggers(html, styles.css).join(', ')}`);
}

cloneAnimations('https://example.com');
```

## Type Definitions

All types are defined in `/Users/bgf/site-cloner/src/types/animations.ts`:

- `CapturedAnimation`
- `AnimationResult`
- `AnimationKeyframe`
- `AnimationTiming`
- `AnimationTrigger`
- `KeyframeAnimation`
- `ScrollAnimation`
- `FramerMotionVariant`
- `FramerMotionTransition`
- `ExtractedStyles`
- `ElementInfo`
- `CDPAnimationEvent`

## Contributing

When adding new animation types:

1. Update `AnimationType` in `types/animations.ts`
2. Add detection logic to appropriate module
3. Update Framer Motion generator to handle new type
4. Add tests and examples

## License

Part of site-cloner project.
