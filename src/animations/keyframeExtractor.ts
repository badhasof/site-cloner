/**
 * Keyframe extractor - extracts CSS keyframes from stylesheets and converts to Framer Motion
 */

import type {
  KeyframeAnimation,
  AnimationKeyframe,
  FramerMotionVariant,
} from '../types/animations.js';

/**
 * Extract all @keyframes rules from CSS string
 */
export function extractKeyframesFromCSS(css: string): KeyframeAnimation[] {
  const animations: KeyframeAnimation[] = [];
  const keyframesRegex = /@keyframes\s+([\w-]+)\s*\{([^}]+\{[^}]*\}[^}]*)\}/gi;

  let match;
  while ((match = keyframesRegex.exec(css)) !== null) {
    const name = match[1];
    const body = match[2];
    const keyframes = parseKeyframeBody(body);

    if (keyframes.length > 0) {
      animations.push({ name, keyframes });
    }
  }

  return animations;
}

/**
 * Parse keyframe body to extract individual keyframes
 */
function parseKeyframeBody(body: string): AnimationKeyframe[] {
  const keyframes: AnimationKeyframe[] = [];
  const frameRegex = /((?:from|to|\d+%(?:\s*,\s*\d+%)*))\s*\{([^}]*)\}/gi;

  let match;
  while ((match = frameRegex.exec(body)) !== null) {
    const offsetStr = match[1].trim();
    const properties = match[2].trim();
    const offsets = parseOffsets(offsetStr);
    const props = parseProperties(properties);

    for (const offset of offsets) {
      keyframes.push({ offset, properties: props });
    }
  }

  keyframes.sort((a, b) => a.offset - b.offset);
  return keyframes;
}

/**
 * Parse offset string to numeric values (0-1)
 */
function parseOffsets(offsetStr: string): number[] {
  if (offsetStr === 'from') return [0];
  if (offsetStr === 'to') return [1];

  const offsets: number[] = [];
  const percentages = offsetStr.split(',').map(s => s.trim());

  for (const pct of percentages) {
    const match = pct.match(/(\d+(?:\.\d+)?)%/);
    if (match) {
      offsets.push(parseFloat(match[1]) / 100);
    }
  }

  return offsets;
}

/**
 * Parse CSS properties from keyframe block
 */
function parseProperties(propStr: string): Record<string, string | number> {
  const properties: Record<string, string | number> = {};
  const declarations = propStr.split(';').map(s => s.trim()).filter(s => s);

  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex === -1) continue;

    const property = decl.substring(0, colonIndex).trim();
    const value = decl.substring(colonIndex + 1).trim();
    const jsProperty = cssToCamelCase(property);
    const numericValue = parseNumericValue(value);

    properties[jsProperty] = numericValue !== null ? numericValue : value;
  }

  return properties;
}

/**
 * Convert CSS property name to camelCase
 */
function cssToCamelCase(cssProperty: string): string {
  return cssProperty.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Try to parse a value as a number
 */
function parseNumericValue(value: string): number | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|deg|s|ms)?$/);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num)) return num;
  }
  return null;
}

/**
 * Convert CSS keyframe animation to Framer Motion variant
 */
export function convertToFramerMotionVariant(
  animation: KeyframeAnimation,
  duration: number = 1000,
  easing: string = 'ease'
): FramerMotionVariant {
  if (animation.keyframes.length === 0) return {};

  const initialFrame = animation.keyframes.find(kf => kf.offset === 0);
  const finalFrame = animation.keyframes.find(kf => kf.offset === 1);
  const variant: FramerMotionVariant = {};

  if (initialFrame) {
    variant.initial = convertPropertiesToFramerFormat(initialFrame.properties);
  }

  if (finalFrame) {
    variant.animate = convertPropertiesToFramerFormat(finalFrame.properties);
  } else if (animation.keyframes.length > 0) {
    const lastFrame = animation.keyframes[animation.keyframes.length - 1];
    variant.animate = convertPropertiesToFramerFormat(lastFrame.properties);
  }

  // Handle intermediate keyframes
  if (animation.keyframes.length > 2) {
    const animateWithKeyframes: Record<string, any[]> = {};
    const properties = new Set<string>();

    for (const kf of animation.keyframes) {
      for (const prop of Object.keys(kf.properties)) {
        properties.add(prop);
      }
    }

    for (const prop of properties) {
      const values: any[] = [];
      for (const kf of animation.keyframes) {
        const framerProp = convertPropertiesToFramerFormat({ [prop]: kf.properties[prop] });
        values.push(framerProp[prop] ?? values[values.length - 1] ?? 0);
      }
      animateWithKeyframes[prop] = values;
    }

    variant.animate = animateWithKeyframes;
  }

  variant.transition = {
    duration: duration / 1000,
    ease: convertEasingToFramer(easing),
  };

  return variant;
}

/**
 * Convert CSS properties to Framer Motion format
 */
function convertPropertiesToFramerFormat(
  properties: Record<string, string | number>
): Record<string, any> {
  const framerProps: Record<string, any> = {};

  for (const [key, value] of Object.entries(properties)) {
    switch (key) {
      case 'transform':
        Object.assign(framerProps, parseTransform(value as string));
        break;
      case 'opacity':
        framerProps.opacity = typeof value === 'number' ? value : parseFloat(value as string);
        break;
      case 'backgroundColor':
      case 'background':
        framerProps.backgroundColor = value;
        break;
      case 'color':
        framerProps.color = value;
        break;
      default:
        framerProps[key] = value;
    }
  }

  return framerProps;
}

/**
 * Parse CSS transform string into individual properties
 */
function parseTransform(transform: string): Record<string, any> {
  const props: Record<string, any> = {};
  if (!transform || transform === 'none') return props;

  const translateMatch = transform.match(/translate(?:X|Y|Z|3d)?\(([^)]+)\)/);
  if (translateMatch) {
    const values = translateMatch[1].split(',').map(v => v.trim());
    if (values.length >= 1) props.x = parseValueWithUnit(values[0]);
    if (values.length >= 2) props.y = parseValueWithUnit(values[1]);
    if (values.length >= 3) props.z = parseValueWithUnit(values[2]);
  }

  const rotateMatch = transform.match(/rotate(?:X|Y|Z)?\(([^)]+)\)/);
  if (rotateMatch) {
    const value = rotateMatch[1].trim();
    if (transform.includes('rotateX')) props.rotateX = parseValueWithUnit(value);
    else if (transform.includes('rotateY')) props.rotateY = parseValueWithUnit(value);
    else props.rotate = parseValueWithUnit(value);
  }

  const scaleMatch = transform.match(/scale(?:X|Y|Z)?\(([^)]+)\)/);
  if (scaleMatch) {
    const values = scaleMatch[1].split(',').map(v => v.trim());
    if (transform.includes('scaleX')) props.scaleX = parseFloat(values[0]);
    else if (transform.includes('scaleY')) props.scaleY = parseFloat(values[0]);
    else {
      props.scale = parseFloat(values[0]);
      if (values.length > 1) {
        props.scaleX = parseFloat(values[0]);
        props.scaleY = parseFloat(values[1]);
        delete props.scale;
      }
    }
  }

  const skewMatch = transform.match(/skew(?:X|Y)?\(([^)]+)\)/);
  if (skewMatch) {
    const values = skewMatch[1].split(',').map(v => v.trim());
    if (transform.includes('skewX')) props.skewX = parseValueWithUnit(values[0]);
    else if (transform.includes('skewY')) props.skewY = parseValueWithUnit(values[0]);
    else {
      props.skewX = parseValueWithUnit(values[0]);
      if (values.length > 1) props.skewY = parseValueWithUnit(values[1]);
    }
  }

  return props;
}

/**
 * Parse a value with its unit
 */
function parseValueWithUnit(value: string): number | string {
  const numMatch = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%|deg)?$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const unit = numMatch[2];
    if (!unit || unit === 'px') return num;
    return value;
  }
  return value;
}

/**
 * Convert CSS easing to Framer Motion easing
 */
export function convertEasingToFramer(cssEasing: string): string | number[] {
  const easingMap: Record<string, string> = {
    'linear': 'linear',
    'ease': 'easeInOut',
    'ease-in': 'easeIn',
    'ease-out': 'easeOut',
    'ease-in-out': 'easeInOut',
  };

  const mapped = easingMap[cssEasing.toLowerCase()];
  if (mapped) return mapped;

  const cubicMatch = cssEasing.match(/cubic-bezier\(([^)]+)\)/);
  if (cubicMatch) {
    const values = cubicMatch[1].split(',').map(v => parseFloat(v.trim()));
    if (values.length === 4) return values;
  }

  return 'easeInOut';
}

/**
 * Extract animation usage from CSS
 */
export function extractAnimationUsage(css: string): Array<{
  selector: string;
  animationName: string;
  duration: number;
  delay: number;
  iterations: number | 'infinite';
  direction: string;
  easing: string;
  fillMode: string;
}> {
  const usages: Array<any> = [];
  const ruleRegex = /([^{}]+)\{([^}]*(?:animation(?:-name)?:[^;]+)[^}]*)\}/gi;

  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2];

    const animationName = extractProperty(declarations, 'animation-name');
    const duration = parseDuration(extractProperty(declarations, 'animation-duration') || '0s');
    const delay = parseDuration(extractProperty(declarations, 'animation-delay') || '0s');
    const iterations = parseIterations(extractProperty(declarations, 'animation-iteration-count') || '1');
    const direction = extractProperty(declarations, 'animation-direction') || 'normal';
    const easing = extractProperty(declarations, 'animation-timing-function') || 'ease';
    const fillMode = extractProperty(declarations, 'animation-fill-mode') || 'none';

    const animationShorthand = extractProperty(declarations, 'animation');
    if (animationShorthand && !animationName) {
      const parts = animationShorthand.split(/\s+/);
      if (parts.length > 0) {
        usages.push({
          selector,
          animationName: parts[0],
          duration: parseDuration(parts[1] || '0s'),
          delay: parseDuration(parts[2] || '0s'),
          iterations: parseIterations(parts[3] || '1'),
          direction: parts[4] || 'normal',
          easing: parts[5] || 'ease',
          fillMode: parts[6] || 'none',
        });
      }
    } else if (animationName) {
      usages.push({
        selector,
        animationName,
        duration,
        delay,
        iterations,
        direction,
        easing,
        fillMode,
      });
    }
  }

  return usages;
}

function extractProperty(declarations: string, property: string): string | null {
  const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
  const match = declarations.match(regex);
  return match ? match[1].trim() : null;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)(s|ms)$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  return unit === 's' ? value * 1000 : value;
}

function parseIterations(iterations: string): number | 'infinite' {
  if (iterations === 'infinite') return 'infinite';
  const num = parseFloat(iterations);
  return isNaN(num) ? 1 : num;
}
