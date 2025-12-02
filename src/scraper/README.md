# Site Scraper Module

A comprehensive web scraping module built with Playwright that extracts JavaScript bundles, CSS styles, and assets from websites.

## Features

- **JavaScript Bundle Extraction**: Intercepts and captures all JavaScript files including:
  - External script files (.js, .mjs, .cjs)
  - Inline script tags
  - Automatic bundler detection (Webpack, Vite, Parcel, Rollup, esbuild)

- **Style Extraction**: Collects CSS from multiple sources:
  - External stylesheets (link tags)
  - Inline style tags
  - Computed styles from visible elements
  - CSS keyframe animations
  - CSS custom properties (variables)

- **Asset Download**: Downloads all page assets:
  - Images (img src, srcset, background-image)
  - Fonts (@font-face declarations)
  - Videos (video, source tags)
  - SVG files
  - Organized by type in subdirectories

## Usage

### Basic Usage

```typescript
import { scrape } from './scraper/index.js';

const result = await scrape('https://example.com');

console.log(`Extracted ${result.bundles.length} JavaScript bundles`);
console.log(`Extracted ${result.styles.length} stylesheets`);
console.log(`Downloaded ${result.assets.length} assets`);
```

### With Options

```typescript
import { scrape } from './scraper/index.js';

const result = await scrape('https://example.com', {
  timeout: 60000, // 60 second timeout
  headless: false, // Show browser window
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Custom User Agent String',
});
```

## API

### `scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult>`

Main scraping function that orchestrates the entire process.

**Parameters:**
- `url` (string): The URL to scrape
- `options` (ScrapeOptions, optional): Configuration options
  - `timeout` (number): Page load timeout in milliseconds (default: 30000)
  - `headless` (boolean): Run browser in headless mode (default: true)
  - `viewport` (object): Browser viewport dimensions (default: 1920x1080)
  - `userAgent` (string): Custom user agent string

**Returns:** `Promise<ScrapeResult>`
```typescript
{
  url: string;
  html: string;
  bundles: ExtractedBundle[];
  styles: ExtractedStyles[];
  assets: Asset[];
  metadata: {
    timestamp: Date;
    duration: number;
    title: string;
  };
}
```

## Module Structure

```
src/scraper/
├── index.ts              # Main orchestration
├── bundleExtractor.ts    # JavaScript bundle interception
├── styleExtractor.ts     # CSS extraction
├── assetDownloader.ts    # Asset downloading
└── README.md            # This file
```

## Implementation Details

### Bundle Extraction

The bundle extractor uses Playwright's route interception to capture JavaScript files as they're requested:

```typescript
await page.route('**/*.{js,mjs,cjs}', async (route) => {
  const response = await route.fetch();
  const content = await response.body();
  // Store content for analysis
  await route.fulfill({ response });
});
```

Bundler detection looks for common patterns:
- **Webpack**: `__webpack_require__`, `webpackChunk`
- **Vite**: `import.meta`, `__vite`
- **Parcel**: `parcelRequire`, `$parcel$`
- **Rollup**: Rollup banner comments
- **esbuild**: `__toCommonJS`, `__esm(`

### Style Extraction

Styles are collected from three sources:

1. **External Stylesheets**: Fetched via link tags
2. **Inline Styles**: Extracted from style tags
3. **Computed Styles**: Captured from visible elements using `getComputedStyle()`

Keyframes and CSS variables are also extracted separately for convenience.

### Asset Download

Assets are discovered by:
- Scanning all img tags (src and srcset)
- Parsing video and source tags
- Extracting background-image URLs from inline and computed styles
- Finding @font-face declarations in stylesheets

Downloaded assets are organized in subdirectories by type:
```
assets/
├── images/
├── fonts/
├── videos/
├── svgs/
└── others/
```

## Error Handling

The scraper includes comprehensive error handling:
- Network request failures are logged but don't stop execution
- Cross-origin stylesheet access errors are caught and logged
- Invalid URLs are skipped during asset extraction
- Browser cleanup occurs even if scraping fails

## Performance

- Assets are downloaded with concurrency limiting (5 concurrent downloads)
- Request interception is set up before navigation for efficiency
- Page waits for 'networkidle' to ensure all resources are loaded

## Dependencies

- `playwright`: Browser automation
- Node.js built-ins: `fs/promises`, `path`, `crypto`, `os`
