/**
 * URL Rewriter - Maps original asset URLs to local paths
 */

import { Asset } from '../types/index.js';

/**
 * URL mapping from original URLs to local paths
 */
export class URLMapper {
  private urlMap: Map<string, string>;

  constructor(assets: Asset[]) {
    this.urlMap = new Map();

    // Build mapping from original URLs to local paths
    for (const asset of assets) {
      if (asset.relativePath) {
        // Use relativePath directly for URL rewriting
        // e.g., "images/logo.png" -> "/assets/images/logo.png"
        this.urlMap.set(asset.url, `/assets/${asset.relativePath}`);
      } else if (asset.localPath) {
        // Fallback: Convert absolute local path to relative public path
        const publicPath = this.toPublicPath(asset.localPath, asset.type);
        this.urlMap.set(asset.url, publicPath);
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
    // Try exact match first
    if (this.urlMap.has(url)) {
      return this.urlMap.get(url)!;
    }

    // Try without query parameters and hash
    try {
      const urlObj = new URL(url);
      const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
      if (this.urlMap.has(cleanUrl)) {
        return this.urlMap.get(cleanUrl)!;
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
