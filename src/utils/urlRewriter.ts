/**
 * URL Rewriter - Maps original asset URLs to local paths
 */

import { Asset } from '../types/index.js';

/**
 * URL mapping from original URLs to local paths
 */
export class URLMapper {
  private urlMap: Map<string, string>;
  private baseUrl?: string;
  private pathMap: Map<string, string>; // Map pathname to local path

  constructor(assets: Asset[], baseUrl?: string) {
    this.urlMap = new Map();
    this.pathMap = new Map();
    this.baseUrl = baseUrl;

    // Build mapping from original URLs to local paths
    for (const asset of assets) {
      const localPath = asset.relativePath
        ? `/assets/${asset.relativePath}`
        : this.toPublicPath(asset.localPath || '', asset.type);

      // Store full URL mapping
      this.urlMap.set(asset.url, localPath);

      // Also store pathname-only mapping for relative URL lookups
      try {
        const urlObj = new URL(asset.url);
        this.pathMap.set(urlObj.pathname, localPath);
        // Also store without query params
        const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
        this.urlMap.set(cleanUrl, localPath);
      } catch {
        // Not a valid URL, skip path mapping
      }
    }
  }

  /**
   * Convert local file path to public asset path
   */
  private toPublicPath(localPath: string, type: Asset['type']): string {
    // Extract just the filename from the local path
    const parts = localPath.split('/');
    const filename = parts[parts.length - 1];

    // Organize by asset type
    const subdir = this.getAssetSubdir(type);

    return `/assets/${subdir}/${filename}`;
  }

  /**
   * Get subdirectory for asset type
   */
  private getAssetSubdir(type: Asset['type']): string {
    switch (type) {
      case 'image':
        return 'images';
      case 'font':
        return 'fonts';
      case 'video':
        return 'videos';
      case 'svg':
        return 'svgs';
      case 'icon':
        return 'icons';
      default:
        return 'other';
    }
  }

  /**
   * Rewrite a URL to its local path
   * Returns the original URL if no mapping exists
   */
  rewriteURL(url: string): string {
    if (!url) return url;

    // Try exact match first
    if (this.urlMap.has(url)) {
      return this.urlMap.get(url)!;
    }

    // If it's a relative URL, try different strategies
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Strategy 1: Try as pathname directly
      const pathname = url.split('?')[0].split('#')[0]; // Remove query and hash
      if (this.pathMap.has(pathname)) {
        return this.pathMap.get(pathname)!;
      }

      // Strategy 2: If we have a base URL, resolve relative URL to absolute
      if (this.baseUrl) {
        try {
          const absoluteUrl = new URL(url, this.baseUrl).href;
          if (this.urlMap.has(absoluteUrl)) {
            return this.urlMap.get(absoluteUrl)!;
          }
          // Try without query/hash
          const absoluteUrlObj = new URL(absoluteUrl);
          const cleanAbsoluteUrl = `${absoluteUrlObj.origin}${absoluteUrlObj.pathname}`;
          if (this.urlMap.has(cleanAbsoluteUrl)) {
            return this.urlMap.get(cleanAbsoluteUrl)!;
          }
          // Try pathname from absolute URL
          if (this.pathMap.has(absoluteUrlObj.pathname)) {
            return this.pathMap.get(absoluteUrlObj.pathname)!;
          }
        } catch {
          // Failed to resolve, continue
        }
      }

      // Return original relative URL if no mapping found
      return url;
    }

    // It's an absolute URL - try without query parameters and hash
    try {
      const urlObj = new URL(url);
      const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
      if (this.urlMap.has(cleanUrl)) {
        return this.urlMap.get(cleanUrl)!;
      }
      // Try pathname only
      if (this.pathMap.has(urlObj.pathname)) {
        return this.pathMap.get(urlObj.pathname)!;
      }
    } catch {
      // Not a valid URL, return as-is
    }

    // No mapping found, return original
    return url;
  }

  /**
   * Rewrite CSS content to replace url() references with local paths
   */
  rewriteCSSUrls(css: string, baseUrl?: string): string {
    // Match url() references in CSS
    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;

    return css.replace(urlRegex, (match, url) => {
      // Resolve relative URLs if base URL provided
      let absoluteUrl = url;
      if (baseUrl && !url.startsWith('http') && !url.startsWith('data:')) {
        try {
          absoluteUrl = new URL(url, baseUrl).href;
        } catch {
          // Invalid URL, keep original
          return match;
        }
      }

      // Rewrite the URL
      const rewritten = this.rewriteURL(absoluteUrl);

      // Return the rewritten url() reference
      return `url('${rewritten}')`;
    });
  }

  /**
   * Get all mappings (for debugging)
   */
  getMappings(): Map<string, string> {
    return new Map(this.urlMap);
  }

  /**
   * Get statistics about the URL mapping
   */
  getStats(): { totalMappings: number; byType: Record<string, number> } {
    const stats = {
      totalMappings: this.urlMap.size,
      byType: {} as Record<string, number>
    };

    // Count by subdirectory (type)
    for (const localPath of this.urlMap.values()) {
      const match = localPath.match(/\/assets\/([^/]+)\//);
      if (match) {
        const type = match[1];
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    }

    return stats;
  }
}

/**
 * Rewrite attribute value if it's a URL
 */
export function rewriteAttributeURL(
  attrName: string,
  attrValue: string,
  urlMapper: URLMapper
): string {
  // List of attributes that contain URLs
  const urlAttributes = ['src', 'href', 'data', 'poster', 'srcset'];

  if (!urlAttributes.includes(attrName.toLowerCase())) {
    return attrValue;
  }

  // Handle srcset separately (can have multiple URLs)
  if (attrName.toLowerCase() === 'srcset') {
    return rewriteSrcSet(attrValue, urlMapper);
  }

  // Rewrite single URL
  return urlMapper.rewriteURL(attrValue);
}

/**
 * Rewrite srcset attribute (contains multiple URLs with descriptors)
 */
function rewriteSrcSet(srcset: string, urlMapper: URLMapper): string {
  const sources = srcset.split(',').map(s => s.trim());

  return sources.map(source => {
    const parts = source.split(/\s+/);
    if (parts.length === 0) return source;

    // First part is the URL
    const url = parts[0];
    const rewrittenUrl = urlMapper.rewriteURL(url);

    // Rest are descriptors (1x, 2x, 100w, etc.)
    const descriptors = parts.slice(1);

    return [rewrittenUrl, ...descriptors].join(' ');
  }).join(', ');
}

/**
 * Rewrite inline style attribute
 */
export function rewriteStyleAttribute(
  styleValue: string,
  urlMapper: URLMapper
): string {
  return urlMapper.rewriteCSSUrls(styleValue);
}
