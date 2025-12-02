/**
 * Scroll detector - detects scroll-triggered animations by monitoring element states
 */

import type { Page } from 'playwright';
import type { ScrollAnimation, AnimationKeyframe } from '../types/animations.js';

interface ElementState {
  selector: string;
  visible: boolean;
  inViewport: boolean;
  scrollPosition: number;
  opacity: number;
  transform: string;
  translateX: number;
  translateY: number;
  scale: number;
  rotate: number;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

/**
 * Detect scroll-triggered animations by scrolling through the page
 */
export async function detectScrollAnimations(
  page: Page
): Promise<ScrollAnimation[]> {
  const animations: ScrollAnimation[] = [];

  try {
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const elements = await getAnimatableElements(page);
    if (elements.length === 0) return animations;

    const scrollPositions = generateScrollPositions(pageHeight, viewportHeight);
    const statesByPosition = new Map<number, ElementState[]>();

    for (const scrollPos of scrollPositions) {
      await page.evaluate((pos) => window.scrollTo(0, pos), scrollPos);
      await page.waitForTimeout(300);

      const states = await captureElementStates(page, elements);
      statesByPosition.set(scrollPos, states);
    }

    for (const selector of elements) {
      const animation = detectScrollAnimationForElement(
        selector,
        statesByPosition,
        viewportHeight
      );

      if (animation) {
        animations.push(animation);
      }
    }

    await page.evaluate(() => window.scrollTo(0, 0));
  } catch (error) {
    console.error('Error detecting scroll animations:', error);
  }

  return animations;
}

/**
 * Get selectors for elements that might have scroll animations
 */
async function getAnimatableElements(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const selectors: string[] = [];
    const seen = new Set<string>();

    const elements = document.querySelectorAll(
      'section, article, .card, .feature, .hero, [class*="fade"], [class*="slide"], [class*="reveal"], [class*="animate"], [data-aos], [data-scroll]'
    );

    elements.forEach((el) => {
      let selector = el.tagName.toLowerCase();

      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          // Escape special characters in class names for CSS selectors
          const escapedClass = classes[0]
            .replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/:/g, '\\:');
          selector = `${selector}.${escapedClass}`;
        }
      }

      if (!seen.has(selector)) {
        seen.add(selector);
        selectors.push(selector);
      }
    });

    return selectors.slice(0, 50);
  });
}

/**
 * Generate scroll positions to test
 */
function generateScrollPositions(
  pageHeight: number,
  viewportHeight: number
): number[] {
  const positions: number[] = [0];
  const step = viewportHeight * 0.5;

  for (let pos = step; pos < pageHeight - viewportHeight; pos += step) {
    positions.push(Math.floor(pos));
  }

  positions.push(pageHeight - viewportHeight);
  return positions;
}

/**
 * Capture states of elements at current scroll position
 */
async function captureElementStates(
  page: Page,
  selectors: string[]
): Promise<ElementState[]> {
  const scrollPosition = await page.evaluate(() => window.scrollY);
  const states: ElementState[] = [];

  for (const selector of selectors) {
    try {
      const state = await page.evaluate(
        ({ sel, scroll }) => {
          const el = document.querySelector(sel) as HTMLElement;
          if (!el) return null;

          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);

          const inViewport =
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0;

          const transform = styles.transform;
          let translateX = 0;
          let translateY = 0;
          let scale = 1;
          let rotate = 0;

          if (transform && transform !== 'none') {
            const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
            if (matrixMatch) {
              const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
              if (values.length >= 6) {
                translateX = values[4];
                translateY = values[5];
                scale = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
              }
            }

            const translateXMatch = transform.match(/translateX\(([^)]+)\)/);
            if (translateXMatch) translateX = parseFloat(translateXMatch[1]);

            const translateYMatch = transform.match(/translateY\(([^)]+)\)/);
            if (translateYMatch) translateY = parseFloat(translateYMatch[1]);

            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            if (scaleMatch) scale = parseFloat(scaleMatch[1]);

            const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
            if (rotateMatch) rotate = parseFloat(rotateMatch[1]);
          }

          return {
            selector: sel,
            visible: styles.visibility !== 'hidden' && styles.display !== 'none',
            inViewport,
            scrollPosition: scroll,
            opacity: parseFloat(styles.opacity),
            transform: styles.transform,
            translateX,
            translateY,
            scale,
            rotate,
            boundingBox: {
              top: rect.top + scroll,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
          };
        },
        { sel: selector, scroll: scrollPosition }
      );

      if (state) {
        states.push(state);
      }
    } catch (error) {
      console.warn(`Error capturing state for ${selector}:`, error);
    }
  }

  return states;
}

/**
 * Detect scroll animation for a specific element
 */
function detectScrollAnimationForElement(
  selector: string,
  statesByPosition: Map<number, ElementState[]>,
  viewportHeight: number
): ScrollAnimation | null {
  const states: ElementState[] = [];
  const scrollPositions: number[] = [];

  for (const [pos, statesAtPos] of statesByPosition.entries()) {
    const state = statesAtPos.find(s => s.selector === selector);
    if (state) {
      states.push(state);
      scrollPositions.push(pos);
    }
  }

  if (states.length < 2) return null;

  let beforeState: ElementState | null = null;
  let afterState: ElementState | null = null;
  let triggerScroll = 0;

  for (let i = 0; i < states.length - 1; i++) {
    const current = states[i];
    const next = states[i + 1];

    if (!current.inViewport && next.inViewport) {
      beforeState = current;
      afterState = next;
      triggerScroll = scrollPositions[i + 1];
      break;
    }

    if (current.inViewport && next.inViewport) {
      if (hasSignificantChange(current, next)) {
        if (!beforeState) {
          beforeState = current;
          afterState = next;
          triggerScroll = scrollPositions[i + 1];
        }
      }
    }
  }

  if (!beforeState || !afterState) return null;

  const beforeProps = extractAnimatableProperties(beforeState);
  const afterProps = extractAnimatableProperties(afterState);

  if (!hasPropertyChanges(beforeProps, afterProps)) return null;

  const keyframes: AnimationKeyframe[] = [
    { offset: 0, properties: beforeProps },
    { offset: 1, properties: afterProps },
  ];

  return {
    id: `scroll-${selector}`,
    type: 'viewport',
    selector,
    keyframes,
    timing: {
      duration: 600,
      delay: 0,
      iterations: 1,
      direction: 'normal',
      easing: 'ease-out',
      fillMode: 'forwards',
    },
    trigger: {
      type: 'viewport',
      threshold: 0.1,
      margin: '-100px',
      once: true,
    },
    scrollTrigger: {
      start: triggerScroll,
      scrub: false,
    },
    beforeState: beforeProps,
    afterState: afterProps,
  };
}

/**
 * Check if there's a significant change between states
 */
function hasSignificantChange(state1: ElementState, state2: ElementState): boolean {
  const opacityChange = Math.abs(state1.opacity - state2.opacity) > 0.1;
  const translateXChange = Math.abs(state1.translateX - state2.translateX) > 5;
  const translateYChange = Math.abs(state1.translateY - state2.translateY) > 5;
  const scaleChange = Math.abs(state1.scale - state2.scale) > 0.1;
  const rotateChange = Math.abs(state1.rotate - state2.rotate) > 1;

  return opacityChange || translateXChange || translateYChange || scaleChange || rotateChange;
}

/**
 * Extract animatable properties from element state
 */
function extractAnimatableProperties(
  state: ElementState
): Record<string, string | number> {
  const props: Record<string, string | number> = {};

  if (state.opacity < 1) props.opacity = state.opacity;
  if (state.translateX !== 0) props.x = state.translateX;
  if (state.translateY !== 0) props.y = state.translateY;
  if (state.scale !== 1) props.scale = state.scale;
  if (state.rotate !== 0) props.rotate = state.rotate;

  return props;
}

/**
 * Check if there are property changes between two states
 */
function hasPropertyChanges(
  props1: Record<string, string | number>,
  props2: Record<string, string | number>
): boolean {
  const allKeys = new Set([...Object.keys(props1), ...Object.keys(props2)]);

  for (const key of allKeys) {
    if (props1[key] !== props2[key]) return true;
  }

  return false;
}

/**
 * Detect intersection observer based animations
 */
export async function detectIntersectionObserverAnimations(
  page: Page
): Promise<ScrollAnimation[]> {
  return await page.evaluate(() => {
    const animations: any[] = [];

    if (typeof IntersectionObserver === 'undefined') return animations;

    const scrollElements = document.querySelectorAll(
      '[data-aos], [data-scroll], [data-animate], [class*="animate-on-scroll"]'
    );

    scrollElements.forEach((el) => {
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          // Escape special characters in class names for CSS selectors
          const escapedClass = classes[0]
            .replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/:/g, '\\:');
          selector = `${selector}.${escapedClass}`;
        }
      }

      const aos = el.getAttribute('data-aos');
      const scroll = el.getAttribute('data-scroll');
      const animate = el.getAttribute('data-animate');

      if (aos || scroll || animate) {
        const animationType = aos || scroll || animate;
        const properties = mapScrollAnimationType(animationType || '');

        if (Object.keys(properties.before).length > 0) {
          animations.push({
            id: `intersection-${selector}`,
            type: 'viewport',
            selector,
            keyframes: [
              { offset: 0, properties: properties.before },
              { offset: 1, properties: properties.after },
            ],
            timing: {
              duration: 800,
              delay: 0,
              iterations: 1,
              direction: 'normal',
              easing: 'ease-out',
              fillMode: 'forwards',
            },
            trigger: {
              type: 'viewport',
              threshold: 0.1,
              margin: '-50px',
              once: true,
            },
            scrollTrigger: {
              start: 0,
              scrub: false,
            },
            beforeState: properties.before,
            afterState: properties.after,
          });
        }
      }
    });

    function mapScrollAnimationType(type: string): {
      before: Record<string, any>;
      after: Record<string, any>;
    } {
      const typeMap: Record<string, any> = {
        'fade': { before: { opacity: 0 }, after: { opacity: 1 } },
        'fade-up': { before: { opacity: 0, y: 30 }, after: { opacity: 1, y: 0 } },
        'fade-down': { before: { opacity: 0, y: -30 }, after: { opacity: 1, y: 0 } },
        'fade-left': { before: { opacity: 0, x: 30 }, after: { opacity: 1, x: 0 } },
        'fade-right': { before: { opacity: 0, x: -30 }, after: { opacity: 1, x: 0 } },
        'slide-up': { before: { y: 50 }, after: { y: 0 } },
        'slide-down': { before: { y: -50 }, after: { y: 0 } },
        'slide-left': { before: { x: 50 }, after: { x: 0 } },
        'slide-right': { before: { x: -50 }, after: { x: 0 } },
        'zoom-in': { before: { scale: 0.8, opacity: 0 }, after: { scale: 1, opacity: 1 } },
        'zoom-out': { before: { scale: 1.2, opacity: 0 }, after: { scale: 1, opacity: 1 } },
      };

      return typeMap[type.toLowerCase()] || { before: {}, after: {} };
    }

    return animations;
  });
}
