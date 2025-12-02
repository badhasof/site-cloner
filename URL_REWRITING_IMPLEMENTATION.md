# Asset URL Rewriting Implementation

## Overview

This document describes the implementation of asset URL rewriting in the site-cloner project. The URL rewriting system ensures that when HTML/JSX is generated, all asset references (images, fonts, videos, etc.) point to local paths in the `public/assets/` directory instead of their original remote URLs.

## Problem Statement

When the site-cloner generates HTML/JSX code, it was referencing the original remote URLs for assets:
```jsx
<img src="https://example.com/images/logo.png" />
<div style={{ backgroundImage: "url('https://cdn.example.com/bg.jpg')" }} />
```

These URLs needed to be rewritten to point to local assets:
```jsx
<img src="/assets/images/logo.png" />
<div style={{ backgroundImage: "url('/assets/images/bg.jpg')" }} />
```

## Solution Architecture

### 1. URL Mapping System (`src/utils/urlRewriter.ts`)

Created a new `URLMapper` class that:
- Maps original asset URLs to local public paths
- Handles URL rewriting for various contexts (attributes, CSS, inline styles)
- Supports different asset types (images, fonts, videos, SVGs, icons)

**Key Features:**
- **URL Normalization**: Handles URLs with query parameters and hash fragments
- **Type-based Organization**: Assets are organized into subdirectories by type
- **Fallback Behavior**: Returns original URL if no mapping exists
- **Statistics**: Provides mapping statistics for debugging

### 2. Asset Path Storage (`src/scraper/assetDownloader.ts`)

Updated the asset downloader to:
- Store relative paths instead of absolute local paths
- Use consistent path format: `{type}s/{filename}` (e.g., `images/logo.png`)
- Maintain the `localPath` property on `Asset` objects for URL mapping

**Changes:**
```typescript
// Before: absolute path
localPath: '/tmp/site-cloner-123/images/logo.png'

// After: relative path for public directory
localPath: 'images/logo.png'
```

### 3. JSX Generation with URL Rewriting (`src/scraper/htmlExtractor.ts`)

Updated `elementToJSX()` function to:
- Accept optional `URLMapper` parameter
- Rewrite `src`, `href`, `srcset`, `poster`, and `data` attributes
- Rewrite URLs in inline `style` attributes
- Handle complex srcset values with multiple URLs and descriptors

**Key Improvements:**
- **Attribute Rewriting**: All URL-containing attributes are rewritten
- **CSS url() Rewriting**: Inline styles with `url()` references are rewritten
- **srcset Support**: Multiple URLs in srcset are properly rewritten
- **Style Object Conversion**: CSS strings are converted to JSX style objects

### 4. CSS URL Rewriting (`src/styler/index.ts`)

Updated the style processor to:
- Accept optional `URLMapper` parameter
- Rewrite URLs in `@font-face` rules
- Rewrite URLs in background images and other CSS url() references

**Protected Areas:**
- Font face declarations
- CSS custom properties
- Keyframe animations
- Any CSS with url() references

### 5. Generator Integration (`src/generator/index.ts`)

Updated the project generator to:
- Create `URLMapper` instance from downloaded assets
- Pass mapper to `elementToJSX()` during App component generation
- Log URL mapping statistics for debugging

### 6. Main Pipeline Integration (`src/index.ts`)

Updated the main cloning pipeline to:
- Create `URLMapper` for style processing
- Pass mapper to `processStyles()` function
- Provide URL rewriting context throughout the generation process

## File Changes Summary

### New Files
1. **`src/utils/urlRewriter.ts`** - Complete URL rewriting system
   - `URLMapper` class for managing URL mappings
   - `rewriteAttributeURL()` for HTML attributes
   - `rewriteStyleAttribute()` for inline styles
   - Helper functions for srcset and CSS url() rewriting

2. **`src/utils/urlRewriter.test.ts`** - Comprehensive test suite

### Modified Files
1. **`src/scraper/assetDownloader.ts`**
   - Changed `localPath` to store relative paths
   - Updated path generation logic

2. **`src/scraper/htmlExtractor.ts`**
   - Added `URLMapper` import
   - Updated `elementToJSX()` signature to accept `urlMapper`
   - Added URL rewriting for all attributes
   - Added CSS url() rewriting for inline styles
   - Added `convertStyleStringToJSX()` helper function
   - Updated all recursive calls to pass `urlMapper`

3. **`src/styler/index.ts`**
   - Added `URLMapper` import
   - Updated `processStyles()` signature to accept `urlMapper`
   - Updated `generateCustomCSS()` to rewrite font-face URLs

4. **`src/generator/index.ts`**
   - Added `URLMapper` import
   - Created mapper instance in `generateProject()`
   - Updated `writeAppComponent()` to accept and use `urlMapper`
   - Added URL mapping statistics logging

5. **`src/index.ts`**
   - Updated style processing to create and use `URLMapper`
   - Added import for URLMapper during style processing

## URL Rewriting Flow

```
1. Assets Downloaded
   ├─> Original URL: https://example.com/images/logo.png
   └─> Local Path: images/logo.png

2. URLMapper Created
   ├─> Mapping: https://example.com/images/logo.png → /assets/images/logo.png
   └─> Organized by type: images/, fonts/, videos/, etc.

3. HTML/JSX Generation
   ├─> <img src="https://example.com/images/logo.png" />
   └─> <img src="/assets/images/logo.png" />

4. CSS Processing
   ├─> url('https://example.com/fonts/roboto.woff2')
   └─> url('/assets/fonts/roboto.woff2')

5. Final Output
   ├─> All URLs point to /assets/* paths
   └─> Assets copied to public/assets/ directory
```

## Supported URL Types

### HTML Attributes
- `src` - Images, scripts, iframes
- `href` - Links, stylesheets
- `srcset` - Responsive images (with descriptors like 1x, 2x, 100w)
- `poster` - Video posters
- `data` - Data URLs

### CSS References
- `background-image: url(...)`
- `background: url(...)`
- `@font-face { src: url(...) }`
- Any CSS property with `url()` function

### Special Cases
- **Query Parameters**: Stripped before matching (`logo.png?v=123` → `logo.png`)
- **Hash Fragments**: Stripped before matching (`logo.png#anchor` → `logo.png`)
- **srcset Descriptors**: Preserved (`logo.png 1x` → `/assets/images/logo.png 1x`)
- **Multiple URLs**: All rewritten independently in srcset and CSS

## Asset Organization

Assets are organized in the public directory by type:

```
public/
└── assets/
    ├── images/
    │   ├── logo.png
    │   └── bg.jpg
    ├── fonts/
    │   └── roboto.woff2
    ├── videos/
    │   └── intro.mp4
    ├── svgs/
    │   └── icon.svg
    └── icons/
        └── favicon.ico
```

## Testing

The implementation includes comprehensive tests covering:

1. **Basic URL Rewriting**: Simple URL to local path mapping
2. **Query Parameter Handling**: URLs with query strings
3. **Unknown URLs**: Fallback to original URL
4. **Attribute Rewriting**: src, href, and other attributes
5. **srcset Rewriting**: Multiple URLs with descriptors
6. **CSS url() Rewriting**: Background images and fonts
7. **Inline Style Rewriting**: Style attribute processing
8. **Mapping Statistics**: Verification of all mappings

Run tests with:
```bash
node /tmp/test-url-rewriter.mjs
```

## Example Usage

### In Application Code

```typescript
import { URLMapper } from './utils/urlRewriter.js';

// Create mapper from assets
const urlMapper = new URLMapper(assets);

// Rewrite URLs in JSX generation
const jsx = elementToJSX(element, 0, urlMapper);

// Rewrite URLs in CSS processing
const processedStyles = await processStyles(styles, undefined, urlMapper);

// Get statistics
const stats = urlMapper.getStats();
console.log(`Mapped ${stats.totalMappings} assets`);
```

## Benefits

1. **Self-Contained Projects**: Generated projects work without external dependencies
2. **Offline Support**: All assets are local, enabling offline development
3. **Performance**: No external network requests for assets
4. **Consistency**: All asset references use the same local path format
5. **Maintainability**: Centralized URL rewriting logic
6. **Flexibility**: Easy to add new asset types or URL patterns

## Future Enhancements

Potential improvements for the URL rewriting system:

1. **CDN Support**: Option to keep certain CDN URLs (e.g., for fonts)
2. **Asset Optimization**: Automatic image compression during rewriting
3. **Source Maps**: Track original URLs for debugging
4. **Base URL Configuration**: Configurable base path for assets
5. **Lazy Loading**: Generate lazy-loading code for images
6. **WebP Conversion**: Automatic format conversion with fallbacks
7. **Asset Deduplication**: Detect and merge duplicate assets from different URLs

## Troubleshooting

### Assets Not Loading
- Check that assets were actually downloaded to `public/assets/`
- Verify the asset type directory exists (images/, fonts/, etc.)
- Confirm URLMapper created mappings (check console logs)

### URLs Not Rewritten
- Ensure URLMapper is passed to generation functions
- Check that asset has `localPath` property set
- Verify URL format matches exactly (case-sensitive)

### Incorrect Paths
- Check asset type is correctly detected
- Verify localPath format is relative, not absolute
- Ensure no extra slashes in path construction

## Conclusion

The URL rewriting implementation provides a robust, extensible system for converting remote asset URLs to local paths. It integrates seamlessly with the existing site-cloner pipeline and handles various edge cases including query parameters, srcset attributes, and CSS url() references.
