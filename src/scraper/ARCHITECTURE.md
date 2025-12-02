# Scraper Module Architecture

## Module Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Code                               │
│  import { scrape } from './scraper/index.js'                    │
│  const result = await scrape('https://example.com', options)    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    index.ts (Orchestrator)                      │
│  • Launch Playwright browser                                    │
│  • Create browser context with viewport/user agent              │
│  • Set up request interception                                  │
│  • Navigate to URL and wait for network idle                    │
│  • Call extraction modules                                      │
│  • Aggregate results                                            │
│  • Clean up browser                                             │
└─────┬──────────────┬──────────────┬────────────────────────────┘
      │              │              │
      ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐
│  Bundle     │ │   Style     │ │   Asset             │
│  Extractor  │ │  Extractor  │ │  Downloader         │
└─────────────┘ └─────────────┘ └─────────────────────┘
```

## Detailed Component Interaction

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Playwright Browser                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        Page Instance                           │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐ │ │
│  │  │   Route      │  │  evaluate()  │  │   page.content()    │ │ │
│  │  │ Interception │  │   (in-page   │  │   (HTML)            │ │ │
│  │  │              │  │   scripts)   │  │                     │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────────────┘ │ │
│  │         │                 │                  │                │ │
│  └─────────┼─────────────────┼──────────────────┼────────────────┘ │
│            │                 │                  │                  │
└────────────┼─────────────────┼──────────────────┼──────────────────┘
             │                 │                  │
             ▼                 ▼                  ▼
    ┌────────────────┐  ┌──────────────┐  ┌────────────┐
    │ Intercept .js  │  │ Extract CSS  │  │ Get HTML   │
    │ network        │  │ from DOM     │  │ content    │
    │ requests       │  │              │  │            │
    └────────┬───────┘  └──────┬───────┘  └────────────┘
             │                 │
             ▼                 ▼
    ┌────────────────┐  ┌──────────────┐
    │ Store JS code  │  │ Fetch        │
    │ Detect bundler │  │ external CSS │
    └────────┬───────┘  └──────┬───────┘
             │                 │
             ▼                 ▼
    ┌────────────────────────────────┐
    │  processScripts()              │
    │  • Add inline scripts          │
    │  • Detect bundler types        │
    │  • Sort by size                │
    └────────────────────────────────┘
```

## Request Interception Flow

```
Page Navigation
      │
      ├─► Browser makes request: example.com/bundle.js
      │         │
      │         ▼
      │   Route Handler (page.route())
      │         │
      │         ├─► Fetch actual response
      │         │         │
      │         │         ▼
      │         │   Get response body
      │         │         │
      │         │         ▼
      │         │   Store in interceptedScripts[]
      │         │         │
      │         │         ▼
      │         └─► Fulfill response (page continues)
      │
      ├─► Browser makes request: example.com/app.js
      │         │
      │         └─► [Same flow repeats]
      │
      ▼
Page Loaded (networkidle)
      │
      ▼
processScripts() called
      │
      ├─► Add inline <script> tags
      │
      └─► Transform to ExtractedBundle[]
```

## Asset Discovery and Download Flow

```
extractAssetURLs()
      │
      ├─► Query <img> tags (src, srcset)
      │         │
      │         └─► Extract URLs → Add to Set
      │
      ├─► Query <video>, <source> tags
      │         │
      │         └─► Extract URLs → Add to Set
      │
      ├─► Scan inline style attributes
      │         │
      │         └─► Parse background-image → Add to Set
      │
      ├─► Get computed styles for all elements
      │         │
      │         └─► Parse background-image → Add to Set
      │
      └─► Iterate stylesheets
                │
                └─► Find @font-face rules → Add to Set

      ▼
Convert Set to Array
      │
      ▼
downloadAssets()
      │
      ├─► Split into chunks of 5
      │
      └─► For each chunk:
                │
                ├─► Download asset (fetch)
                │
                ├─► Determine type (image/font/video/svg/other)
                │
                ├─► Create type subdirectory
                │
                ├─► Generate safe filename
                │
                └─► Save to disk
```

## Style Extraction Flow

```
extractStyles()
      │
      ├─► External Stylesheets
      │         │
      │         ├─► Query <link rel="stylesheet">
      │         │
      │         ├─► Extract href
      │         │
      │         ├─► Fetch content via HTTP
      │         │
      │         └─► Store as ExtractedStyles (type: 'external')
      │
      ├─► Inline Styles
      │         │
      │         ├─► Query <style> tags
      │         │
      │         ├─► Extract textContent
      │         │
      │         └─► Store as ExtractedStyles (type: 'inline')
      │
      └─► Computed Styles
                │
                ├─► Query all elements (*)
                │
                ├─► Filter visible elements
                │         │
                │         └─► Check width, height, display, visibility
                │
                ├─► Get computed style for each
                │
                ├─► Extract important properties
                │         │
                │         └─► display, position, margin, padding,
                │             background, color, font, flex, grid,
                │             transform, transition, animation, etc.
                │
                ├─► Generate CSS selector
                │         │
                │         └─► tag#id.class1.class2
                │
                └─► Store as ExtractedStyles (type: 'computed')
```

## Data Structures

### InterceptedScript (Internal)
```typescript
{
  url: string;        // "https://example.com/bundle.js"
  content: string;    // Raw JavaScript code
  mimeType: string;   // "application/javascript"
}
```

### ExtractedBundle (Output)
```typescript
{
  url: string;        // "https://example.com/bundle.js"
  code: string;       // Raw JavaScript code
  bundlerType?: string; // "webpack" | "vite" | "parcel" | etc.
  filename?: string;  // "bundle.js"
}
```

### ExtractedStyles (Output)
```typescript
{
  url: string;           // URL or "inline-style-0"
  content: string;       // CSS code
  type: 'inline' | 'external' | 'computed';
  mediaQuery?: string;   // "(min-width: 768px)"
}
```

### Asset (Output)
```typescript
{
  url: string;           // Original URL
  type: 'image' | 'font' | 'video' | 'svg' | 'other';
  localPath?: string;    // "/tmp/site-cloner-xxx/images/logo.png"
  size?: number;         // Bytes
  mimeType?: string;     // "image/png"
}
```

## Error Handling Strategy

```
┌─────────────────────────────────────────┐
│         Try-Catch Hierarchy             │
├─────────────────────────────────────────┤
│                                         │
│  Main scrape() function                 │
│    │                                    │
│    ├─► Catches all errors               │
│    │                                    │
│    └─► Ensures browser cleanup          │
│        (finally block)                  │
│                                         │
│  Individual route handlers              │
│    │                                    │
│    ├─► Log error                        │
│    │                                    │
│    └─► Continue route (don't block)     │
│                                         │
│  Asset downloads                        │
│    │                                    │
│    ├─► Log individual failures          │
│    │                                    │
│    └─► Return null (skip failed asset)  │
│                                         │
│  Stylesheet fetches                     │
│    │                                    │
│    ├─► Log fetch errors                 │
│    │                                    │
│    └─► Return empty string              │
│                                         │
│  Cross-origin stylesheet access         │
│    │                                    │
│    ├─► Catch SecurityError              │
│    │                                    │
│    └─► Log warning and continue         │
│                                         │
└─────────────────────────────────────────┘
```

## Performance Considerations

1. **Concurrency Control**: Assets downloaded in batches of 5
2. **Network Idle**: Waits for all network activity to complete
3. **Request Interception**: Set up before navigation for zero loss
4. **Deduplication**: Uses Set for asset URLs
5. **Early Return**: Skips empty or invalid content
6. **Stream Processing**: Processes data as it arrives

## Security Considerations

1. **URL Sanitization**: Uses URL constructor for validation
2. **Filename Sanitization**: Removes dangerous characters
3. **Cross-Origin Handling**: Gracefully handles CORS errors
4. **User Agent**: Configurable to identify scraper
5. **Timeout Protection**: Prevents infinite hangs
6. **Safe Defaults**: Headless mode by default

## Integration Points

The scraper module integrates with:

1. **Deobfuscator Module**: Passes extracted bundles for analysis
2. **Reconstructor Module**: Provides HTML and assets
3. **Animation Capturer**: Shares page instance for animation detection
4. **Style Processor**: Feeds CSS to Tailwind converter

## Module Exports

```typescript
// Main functions
export { scrape, scrapeSite };

// Types
export type { ScrapeResult, ScrapeOptions };

// From bundleExtractor
export { processScripts };
export type { InterceptedScript };

// From styleExtractor
export { extractStyles, extractKeyframes, extractCSSVariables };

// From assetDownloader
export { downloadAssets, extractAssetURLs };
```
