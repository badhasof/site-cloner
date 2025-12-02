/**
 * Main animations module - orchestrates all animation extraction
 */

import type { Page } from 'playwright';
import type {
  CapturedAnimation,
  AnimationResult,
  KeyframeAnimation,
  ScrollAnimation,
  ExtractedStyles,
} from '../types/animations.js';

import { captureRuntimeAnimations } from './capturer.js';
import {
  extractKeyframesFromCSS,
  extractAnimationUsage,
  convertToFramerMotionVariant,
} from './keyframeExtractor.js';
import {
  detectScrollAnimations,
  detectIntersectionObserverAnimations,
} from './scrollDetector.js';
import {
  generateFramerMotionCodeForAll,
  generateComponentWithVariants,
} from './framerGenerator.js';

/**
 * Extract all animations from a page
 * Main entry point for animation extraction
 */
export async function extractAnimations(
  page: Page,
  styles: ExtractedStyles
): Promise<AnimationResult> {
  console.log('Starting animation extraction...');

  // 1. Extract CSS keyframe animations
  console.log('Extracting CSS keyframes...');
  const cssAnimations = extractKeyframesFromCSS(styles.css);
  console.log(`Found ${cssAnimations.length} CSS keyframe animations`);

  // 2. Extract animation usage from CSS
  const animationUsages = extractAnimationUsage(styles.css);
  console.log(`Found ${animationUsages.length} animation usages in CSS`);

  // 3. Capture runtime animations using CDP and Web Animations API
  console.log('Capturing runtime animations...');
  const runtimeAnimations = await captureRuntimeAnimations(page);
  console.log(`Captured ${runtimeAnimations.length} runtime animations`);

  // 4. Detect scroll-triggered animations
  console.log('Detecting scroll animations...');
  const scrollAnimations = await detectScrollAnimations(page);
  console.log(`Detected ${scrollAnimations.length} scroll animations`);

  // 5. Detect Intersection Observer animations (AOS, etc.)
  console.log('Detecting intersection observer animations...');
  const intersectionAnimations = await detectIntersectionObserverAnimations(page);
  console.log(`Detected ${intersectionAnimations.length} intersection observer animations`);

  // Combine all animations
  const allAnimations: CapturedAnimation[] = [
    ...runtimeAnimations,
    ...scrollAnimations,
    ...intersectionAnimations,
  ];

  // Add CSS keyframe animations that have usage
  for (const usage of animationUsages) {
    const keyframeAnim = cssAnimations.find(
      anim => anim.name === usage.animationName
    );

    if (keyframeAnim) {
      const variant = convertToFramerMotionVariant(
        keyframeAnim,
        usage.duration,
        usage.easing
      );

      allAnimations.push({
        id: `css-${usage.selector}-${usage.animationName}`,
        name: usage.animationName,
        type: 'css-animation',
        selector: usage.selector,
        keyframes: keyframeAnim.keyframes,
        timing: {
          duration: usage.duration,
          delay: usage.delay,
          iterations: usage.iterations,
          direction: usage.direction as any,
          easing: usage.easing,
          fillMode: usage.fillMode as any,
        },
      });
    }
  }

  console.log(`Total animations extracted: ${allAnimations.length}`);

  // Generate Framer Motion code
  console.log('Generating Framer Motion code...');
  const framerMotionCode = generateFramerMotionCodeForAll(allAnimations);

  return {
    animations: allAnimations,
    framerMotionCode,
    cssAnimations,
    scrollAnimations: [...scrollAnimations, ...intersectionAnimations],
  };
}

/**
 * Extract animations from a specific element
 */
export async function extractAnimationsForElement(
  page: Page,
  selector: string,
  styles: ExtractedStyles
): Promise<CapturedAnimation[]> {
  const result = await extractAnimations(page, styles);
  return result.animations.filter(anim => anim.selector === selector);
}

/**
 * Generate Framer Motion component code for specific animations
 */
export function generateAnimationComponents(
  animations: CapturedAnimation[]
): string {
  const components: string[] = [];

  animations.forEach((animation, index) => {
    const componentName = `AnimatedComponent${index + 1}`;
    const component = generateComponentWithVariants(componentName, animation);
    components.push(component);
  });

  return `import { motion } from 'framer-motion';\n\n${components.join('\n\n')}`;
}

/**
 * Detect animation triggers from HTML and CSS
 */
export function detectAnimationTriggers(html: string, css: string): string[] {
  const triggers: string[] = [];

  // Detect scroll animation libraries
  if (html.includes('data-aos') || css.includes('aos')) {
    triggers.push('AOS (Animate On Scroll)');
  }

  if (html.includes('data-scroll') || css.includes('locomotive-scroll')) {
    triggers.push('Locomotive Scroll');
  }

  if (html.includes('gsap') || css.includes('gsap')) {
    triggers.push('GSAP');
  }

  if (html.includes('scrollmagic') || css.includes('scrollmagic')) {
    triggers.push('ScrollMagic');
  }

  // Detect CSS animation usage
  if (css.includes('@keyframes')) {
    triggers.push('CSS Keyframes');
  }

  if (css.includes('transition:')) {
    triggers.push('CSS Transitions');
  }

  // Detect Web Animations API
  if (html.includes('animate(') || html.includes('.animate')) {
    triggers.push('Web Animations API');
  }

  // Detect Intersection Observer
  if (html.includes('IntersectionObserver')) {
    triggers.push('Intersection Observer');
  }

  return triggers;
}

/**
 * Analyze animation performance
 */
export function analyzeAnimationPerformance(
  animations: CapturedAnimation[]
): {
  total: number;
  byType: Record<string, number>;
  warnings: string[];
} {
  const byType: Record<string, number> = {};
  const warnings: string[] = [];

  for (const animation of animations) {
    byType[animation.type] = (byType[animation.type] || 0) + 1;

    // Check for performance issues
    if (animation.timing.duration > 5000) {
      warnings.push(
        `Animation ${animation.id} has long duration (${animation.timing.duration}ms)`
      );
    }

    if (animation.timing.iterations === 'infinite') {
      warnings.push(`Animation ${animation.id} loops infinitely - may impact performance`);
    }

    // Check for properties that might cause layout thrashing
    const properties = animation.keyframes.flatMap(kf =>
      Object.keys(kf.properties)
    );

    const layoutProperties = ['width', 'height', 'top', 'left', 'right', 'bottom'];
    const hasLayoutProperties = properties.some(prop =>
      layoutProperties.includes(prop)
    );

    if (hasLayoutProperties) {
      warnings.push(
        `Animation ${animation.id} animates layout properties - consider using transform instead`
      );
    }
  }

  return {
    total: animations.length,
    byType,
    warnings,
  };
}

/**
 * Export animation data as JSON
 */
export function exportAnimationsAsJSON(
  animations: CapturedAnimation[]
): string {
  return JSON.stringify(animations, null, 2);
}

/**
 * Group animations by selector
 */
export function groupAnimationsBySelector(
  animations: CapturedAnimation[]
): Map<string, CapturedAnimation[]> {
  const grouped = new Map<string, CapturedAnimation[]>();

  for (const animation of animations) {
    const existing = grouped.get(animation.selector) || [];
    existing.push(animation);
    grouped.set(animation.selector, existing);
  }

  return grouped;
}

// Re-export sub-modules for convenience
export * from './capturer.js';
export * from './keyframeExtractor.js';
export * from './scrollDetector.js';
export * from './framerGenerator.js';
