/**
 * Animation capturer - captures animations using Chrome DevTools Protocol
 * Captures runtime animations, transitions, and interactive animations
 */

import type { Page } from 'playwright';
import type {
  CapturedAnimation,
  AnimationKeyframe,
  AnimationTiming,
  ElementInfo,
} from '../types/animations.js';

interface CDPAnimationEvent {
  animation: {
    id: string;
    name: string;
    pausedState: boolean;
    playState: string;
    playbackRate: number;
    startTime: number;
    currentTime: number;
    type: string;
    source: {
      backendNodeId?: number;
      delay?: number;
      endDelay?: number;
      iterationStart?: number;
      iterations?: number;
      duration?: number;
      direction?: string;
      fill?: string;
      easing?: string;
      keyframesRule?: {
        keyframes: Array<{
          offset: number;
          easing: string;
        }>;
      };
    };
  };
}

/**
 * Captures all runtime animations from a page using CDP and Web Animations API
 */
export async function captureRuntimeAnimations(
  page: Page
): Promise<CapturedAnimation[]> {
  const animations: CapturedAnimation[] = [];
  const capturedAnimationIds = new Set<string>();

  try {
    // Get CDP session from Playwright
    const cdp = await page.context().newCDPSession(page);

    // Enable Animation domain
    await cdp.send('Animation.enable');

    // Listen for animation started events
    cdp.on('Animation.animationStarted', async (event: any) => {
      try {
        if (!capturedAnimationIds.has(event.animation.id)) {
          capturedAnimationIds.add(event.animation.id);
          const animation = await parseAnimationEvent(page, cdp, event);
          if (animation) {
            animations.push(animation);
          }
        }
      } catch (error) {
        console.warn('Error parsing animation event:', error);
      }
    });

    // Wait for initial page animations to start
    await page.waitForTimeout(1000);

    // Trigger hover animations on interactive elements
    const hoverAnimations = await captureHoverAnimations(page);
    animations.push(...hoverAnimations);

    // Trigger click animations on interactive elements
    const clickAnimations = await captureClickAnimations(page);
    animations.push(...clickAnimations);

    // Wait a bit more to capture triggered animations
    await page.waitForTimeout(2000);

    // Get all Web Animations API animations
    const webAnimations = await captureWebAnimations(page);
    animations.push(...webAnimations);

    // Detach CDP session
    await cdp.detach();
  } catch (error) {
    console.error('Error capturing runtime animations:', error);
  }

  // Remove duplicates based on selector and animation properties
  return deduplicateAnimations(animations);
}

/**
 * Parse CDP animation event into CapturedAnimation
 */
async function parseAnimationEvent(
  page: Page,
  cdp: any,
  event: CDPAnimationEvent
): Promise<CapturedAnimation | null> {
  try {
    const { animation } = event;
    const source = animation.source;

    // Get element info if backendNodeId is available
    let selector = 'unknown';
    let elementInfo: ElementInfo | undefined;

    if (source.backendNodeId) {
      const nodeInfo = await getNodeInfo(page, cdp, source.backendNodeId);
      if (nodeInfo) {
        selector = nodeInfo.selector;
        elementInfo = nodeInfo.elementInfo;
      }
    }

    // Extract timing information
    const timing: AnimationTiming = {
      duration: source.duration || 0,
      delay: source.delay || 0,
      iterations: source.iterations || 1,
      direction: (source.direction as any) || 'normal',
      easing: source.easing || 'linear',
      fillMode: (source.fill as any) || 'none',
    };

    // Extract keyframes
    const keyframes: AnimationKeyframe[] = [];
    if (source.keyframesRule?.keyframes) {
      for (const kf of source.keyframesRule.keyframes) {
        keyframes.push({
          offset: kf.offset,
          properties: {},
          easing: kf.easing,
        });
      }
    }

    return {
      id: animation.id,
      name: animation.name,
      type: animation.type === 'CSSAnimation' ? 'css-animation' : 'css-transition',
      selector,
      keyframes,
      timing,
      element: elementInfo,
    };
  } catch (error) {
    console.warn('Error parsing animation event:', error);
    return null;
  }
}

/**
 * Get node information from backend node ID
 */
async function getNodeInfo(
  page: Page,
  cdp: any,
  backendNodeId: number
): Promise<{ selector: string; elementInfo: ElementInfo } | null> {
  try {
    const { object } = await cdp.send('DOM.resolveNode', { backendNodeId });
    if (!object?.objectId) return null;

    const nodeId = await cdp.send('DOM.requestNode', { objectId: object.objectId });
    const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId: nodeId.nodeId });

    const selector = createSelectorFromHTML(outerHTML);

    return {
      selector,
      elementInfo: {
        tag: 'div',
        selector,
        computedStyle: {},
      },
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create a CSS selector from HTML
 */
function createSelectorFromHTML(html: string): string {
  const match = html.match(/<(\w+)([^>]*)>/);
  if (!match) return 'div';

  const tag = match[1];
  const attrs = match[2];

  const idMatch = attrs.match(/id="([^"]+)"/);
  if (idMatch) return `#${idMatch[1]}`;

  const classMatch = attrs.match(/class="([^"]+)"/);
  if (classMatch) {
    const classes = classMatch[1].split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      // Escape special characters in class names for CSS selectors
      const escapedClasses = classes.map(c =>
        c.replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/:/g, '\\:')
      );
      return `${tag}.${escapedClasses.join('.')}`;
    }
  }

  return tag;
}

/**
 * Capture animations using Web Animations API
 */
async function captureWebAnimations(page: Page): Promise<CapturedAnimation[]> {
  return await page.evaluate(() => {
    const animations: any[] = [];
    const docAnimations = (document as any).getAnimations?.() || [];

    for (const anim of docAnimations) {
      try {
        const effect = anim.effect;
        if (!effect) continue;

        const target = effect.target;
        if (!target) continue;

        let selector = target.tagName?.toLowerCase() || 'div';
        if (target.id) {
          selector = `#${target.id}`;
        } else if (target.className) {
          const classes = target.className.split(' ').filter((c: string) => c.trim());
          if (classes.length > 0) {
            // Escape special characters in class names for CSS selectors
            const escapedClasses = classes.map((c: string) =>
              c.replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/:/g, '\\:')
            );
            selector = `${selector}.${escapedClasses.join('.')}`;
          }
        }

        const keyframes: any[] = [];
        const rawKeyframes = effect.getKeyframes?.() || [];

        for (const kf of rawKeyframes) {
          const properties: Record<string, any> = {};
          for (const [key, value] of Object.entries(kf)) {
            if (key !== 'offset' && key !== 'easing' && key !== 'composite') {
              properties[key] = value;
            }
          }

          keyframes.push({
            offset: kf.offset ?? 0,
            properties,
            easing: kf.easing || 'linear',
          });
        }

        const timing = effect.getTiming();

        animations.push({
          id: anim.id || `web-anim-${Math.random().toString(36).substr(2, 9)}`,
          name: anim.animationName || undefined,
          type: 'web-animation',
          selector,
          keyframes,
          timing: {
            duration: typeof timing.duration === 'number' ? timing.duration : 0,
            delay: timing.delay || 0,
            iterations: timing.iterations || 1,
            direction: timing.direction || 'normal',
            easing: timing.easing || 'linear',
            fillMode: timing.fill || 'none',
          },
        });
      } catch (error) {
        console.warn('Error capturing web animation:', error);
      }
    }

    return animations;
  });
}

/**
 * Capture hover animations by hovering over interactive elements
 */
async function captureHoverAnimations(page: Page): Promise<CapturedAnimation[]> {
  const animations: CapturedAnimation[] = [];

  try {
    const hoverableElements = await page.evaluate(() => {
      const selectors: Array<{ selector: string; index: number }> = [];
      const elements = document.querySelectorAll(
        'a, button, [role="button"], .btn, .button, [class*="hover"]'
      );

      elements.forEach((el, index) => {
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
        selectors.push({ selector, index });
      });

      return selectors.slice(0, 20);
    });

    for (const { selector, index } of hoverableElements) {
      try {
        const beforeState = await page.evaluate(({ sel, idx }: { sel: string; idx: number }) => {
          const elements = document.querySelectorAll(sel);
          const el = elements[idx] as HTMLElement;
          if (!el) return null;

          const styles = window.getComputedStyle(el);
          return {
            opacity: styles.opacity,
            transform: styles.transform,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
          };
        }, { sel: selector, idx: index });

        if (!beforeState) continue;

        const elements = await page.locator(selector).all();
        if (elements[index]) {
          await elements[index].hover({ timeout: 1000 }).catch(() => {});
          await page.waitForTimeout(300);

          const afterState = await page.evaluate(({ sel, idx }: { sel: string; idx: number }) => {
            const elements = document.querySelectorAll(sel);
            const el = elements[idx] as HTMLElement;
            if (!el) return null;

            const styles = window.getComputedStyle(el);
            return {
              opacity: styles.opacity,
              transform: styles.transform,
              backgroundColor: styles.backgroundColor,
              color: styles.color,
            };
          }, { sel: selector, idx: index });

          if (afterState && hasStateChanged(beforeState, afterState)) {
            animations.push({
              id: `hover-${selector}-${index}`,
              type: 'hover',
              selector,
              keyframes: [
                { offset: 0, properties: beforeState },
                { offset: 1, properties: afterState },
              ],
              timing: {
                duration: 300,
                delay: 0,
                iterations: 1,
                direction: 'normal',
                easing: 'ease',
                fillMode: 'forwards',
              },
              trigger: { type: 'hover' },
            });
          }

          await page.mouse.move(0, 0);
          await page.waitForTimeout(200);
        }
      } catch (error) {
        console.warn(`Error capturing hover for ${selector}:`, error);
      }
    }
  } catch (error) {
    console.warn('Error capturing hover animations:', error);
  }

  return animations;
}

/**
 * Capture click animations
 */
async function captureClickAnimations(page: Page): Promise<CapturedAnimation[]> {
  const animations: CapturedAnimation[] = [];

  try {
    const clickableElements = await page.evaluate(() => {
      const selectors: Array<{ selector: string; index: number }> = [];
      const elements = document.querySelectorAll(
        'button, [role="button"], .btn, .button'
      );

      elements.forEach((el, index) => {
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
        selectors.push({ selector, index });
      });

      return selectors.slice(0, 10);
    });

    for (const { selector, index } of clickableElements) {
      try {
        const elements = await page.locator(selector).all();
        if (elements[index]) {
          const beforeState = await page.evaluate(({ sel, idx }: { sel: string; idx: number }) => {
            const elements = document.querySelectorAll(sel);
            const el = elements[idx] as HTMLElement;
            if (!el) return null;

            const styles = window.getComputedStyle(el);
            return {
              transform: styles.transform,
              opacity: styles.opacity,
              scale: styles.scale || '1',
            };
          }, { sel: selector, idx: index });

          if (!beforeState) continue;

          await elements[index].click({ timeout: 1000 }).catch(() => {});
          await page.waitForTimeout(100);

          const duringState = await page.evaluate(({ sel, idx }: { sel: string; idx: number }) => {
            const elements = document.querySelectorAll(sel);
            const el = elements[idx] as HTMLElement;
            if (!el) return null;

            const styles = window.getComputedStyle(el);
            return {
              transform: styles.transform,
              opacity: styles.opacity,
              scale: styles.scale || '1',
            };
          }, { sel: selector, idx: index });

          if (duringState && hasStateChanged(beforeState, duringState)) {
            animations.push({
              id: `click-${selector}-${index}`,
              type: 'click',
              selector,
              keyframes: [
                { offset: 0, properties: beforeState },
                { offset: 1, properties: duringState },
              ],
              timing: {
                duration: 150,
                delay: 0,
                iterations: 1,
                direction: 'normal',
                easing: 'ease-out',
                fillMode: 'none',
              },
              trigger: { type: 'click' },
            });
          }

          await page.waitForTimeout(300);
        }
      } catch (error) {
        console.warn(`Error capturing click for ${selector}:`, error);
      }
    }
  } catch (error) {
    console.warn('Error capturing click animations:', error);
  }

  return animations;
}

function hasStateChanged(before: Record<string, any>, after: Record<string, any>): boolean {
  for (const key in before) {
    if (before[key] !== after[key]) return true;
  }
  return false;
}

function deduplicateAnimations(animations: CapturedAnimation[]): CapturedAnimation[] {
  const seen = new Set<string>();
  const unique: CapturedAnimation[] = [];

  for (const anim of animations) {
    const key = `${anim.selector}-${anim.type}-${JSON.stringify(anim.keyframes)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(anim);
    }
  }

  return unique;
}
