/**
 * Framer Motion code generator - converts captured animations to Framer Motion JSX
 */

import type {
  CapturedAnimation,
  FramerMotionVariant,
  FramerMotionTransition,
} from '../types/animations.js';
import { convertEasingToFramer } from './keyframeExtractor.js';

/**
 * Generate Framer Motion code for a captured animation
 */
export function generateFramerMotionCode(animation: CapturedAnimation): string {
  const variant = convertAnimationToVariant(animation);
  return generateMotionComponentCode(animation.selector, variant);
}

/**
 * Generate Framer Motion code for multiple animations
 */
export function generateFramerMotionCodeForAll(
  animations: CapturedAnimation[]
): string {
  const imports = generateImports();
  const components: string[] = [];

  for (const animation of animations) {
    const code = generateFramerMotionCode(animation);
    components.push(code);
  }

  return `${imports}\n\n${components.join('\n\n')}`;
}

/**
 * Generate necessary imports for Framer Motion
 */
function generateImports(): string {
  return `import { motion } from 'framer-motion';`;
}

/**
 * Convert CapturedAnimation to FramerMotionVariant
 */
function convertAnimationToVariant(
  animation: CapturedAnimation
): FramerMotionVariant {
  const variant: FramerMotionVariant = {};

  // Extract initial and final states from keyframes
  if (animation.keyframes.length > 0) {
    const initialFrame = animation.keyframes.find(kf => kf.offset === 0);
    const finalFrame = animation.keyframes.find(kf => kf.offset === 1);

    if (initialFrame) {
      variant.initial = initialFrame.properties;
    }

    if (finalFrame) {
      variant.animate = finalFrame.properties;
    } else if (animation.keyframes.length > 0) {
      // Use last keyframe as final state
      const lastFrame = animation.keyframes[animation.keyframes.length - 1];
      variant.animate = lastFrame.properties;
    }
  }

  // Handle different animation types
  switch (animation.type) {
    case 'hover':
      if (variant.animate) {
        variant.whileHover = variant.animate;
        delete variant.animate;
      }
      break;

    case 'click':
      if (variant.animate) {
        variant.whileTap = variant.animate;
        delete variant.animate;
      }
      break;

    case 'viewport':
    case 'scroll':
      if (variant.animate) {
        variant.whileInView = variant.animate;
        delete variant.animate;
      }
      if (animation.trigger) {
        variant.viewport = {
          once: animation.trigger.once ?? true,
          margin: animation.trigger.margin || '-100px',
          amount: animation.trigger.threshold || 0.1,
        };
      }
      break;
  }

  // Add transition
  variant.transition = convertTimingToTransition(animation.timing);

  return variant;
}

/**
 * Convert animation timing to Framer Motion transition
 */
function convertTimingToTransition(
  timing: any
): FramerMotionTransition {
  const transition: FramerMotionTransition = {
    duration: timing.duration ? timing.duration / 1000 : 0.5,
    delay: timing.delay ? timing.delay / 1000 : 0,
  };

  // Convert easing
  if (timing.easing) {
    transition.ease = convertEasingToFramer(timing.easing);
  }

  // Handle iterations
  if (timing.iterations && timing.iterations !== 1) {
    if (timing.iterations === 'infinite') {
      transition.repeat = Infinity;
    } else {
      transition.repeat = timing.iterations - 1;
    }

    // Handle direction
    if (timing.direction === 'reverse') {
      transition.repeatType = 'reverse';
    } else if (timing.direction === 'alternate' || timing.direction === 'alternate-reverse') {
      transition.repeatType = 'mirror';
    }
  }

  return transition;
}

/**
 * Generate motion component JSX code
 */
function generateMotionComponentCode(
  selector: string,
  variant: FramerMotionVariant
): string {
  const tag = extractTagFromSelector(selector);
  const props: string[] = [];

  // Add variant props
  if (variant.initial) {
    props.push(`initial={${formatObject(variant.initial)}}`);
  }

  if (variant.animate) {
    props.push(`animate={${formatObject(variant.animate)}}`);
  }

  if (variant.whileHover) {
    props.push(`whileHover={${formatObject(variant.whileHover)}}`);
  }

  if (variant.whileTap) {
    props.push(`whileTap={${formatObject(variant.whileTap)}}`);
  }

  if (variant.whileInView) {
    props.push(`whileInView={${formatObject(variant.whileInView)}}`);
  }

  if (variant.exit) {
    props.push(`exit={${formatObject(variant.exit)}}`);
  }

  // Add transition
  if (variant.transition) {
    props.push(`transition={${formatObject(variant.transition)}}`);
  }

  // Add viewport
  if (variant.viewport) {
    props.push(`viewport={${formatObject(variant.viewport)}}`);
  }

  const propsString = props.length > 0 ? '\n  ' + props.join('\n  ') + '\n' : '';

  return `<motion.${tag}${propsString}>
  {/* Content */}
</motion.${tag}>`;
}

/**
 * Extract HTML tag from selector
 */
function extractTagFromSelector(selector: string): string {
  // Handle ID selectors
  if (selector.startsWith('#')) {
    return 'div';
  }

  // Handle class selectors
  if (selector.startsWith('.')) {
    return 'div';
  }

  // Extract tag name
  const match = selector.match(/^(\w+)/);
  if (match) {
    return match[1];
  }

  return 'div';
}

/**
 * Format an object as JSX prop value
 */
function formatObject(obj: any, indent: number = 0): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj !== 'object') {
    return formatValue(obj);
  }

  if (Array.isArray(obj)) {
    return formatArray(obj);
  }

  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return '{}';
  }

  const indentStr = '  '.repeat(indent);
  const innerIndentStr = '  '.repeat(indent + 1);

  const formatted = entries
    .map(([key, value]) => {
      const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
      const formattedValue = formatValue(value, indent + 1);
      return `${innerIndentStr}${formattedKey}: ${formattedValue}`;
    })
    .join(',\n');

  return `{\n${formatted}\n${indentStr}}`;
}

/**
 * Format array as JSX prop value
 */
function formatArray(arr: any[]): string {
  if (arr.length === 0) {
    return '[]';
  }

  const formatted = arr.map(item => formatValue(item)).join(', ');
  return `[${formatted}]`;
}

/**
 * Format a single value
 */
function formatValue(value: any, indent: number = 0): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return formatArray(value);
  }

  if (typeof value === 'object') {
    return formatObject(value, indent);
  }

  return String(value);
}

/**
 * Generate animation variants as a separate constant
 */
export function generateVariantsConstant(
  name: string,
  variant: FramerMotionVariant
): string {
  const formattedVariant = formatObject(variant);
  return `const ${name}Variants = ${formattedVariant};`;
}

/**
 * Generate complete component with variants
 */
export function generateComponentWithVariants(
  componentName: string,
  animation: CapturedAnimation
): string {
  const variant = convertAnimationToVariant(animation);
  const tag = extractTagFromSelector(animation.selector);

  const variantsConst = generateVariantsConstant(componentName, variant);

  const props: string[] = [];

  if (variant.initial) {
    props.push('initial="initial"');
  }

  if (variant.animate) {
    props.push('animate="animate"');
  }

  if (variant.whileHover) {
    props.push('whileHover="whileHover"');
  }

  if (variant.whileTap) {
    props.push('whileTap="whileTap"');
  }

  if (variant.whileInView) {
    props.push('whileInView="whileInView"');
  }

  if (variant.viewport) {
    props.push(`viewport={${formatObject(variant.viewport)}}`);
  }

  props.push(`variants={${componentName}Variants}`);

  if (variant.transition) {
    props.push(`transition={${formatObject(variant.transition)}}`);
  }

  const propsString = props.length > 0 ? '\n  ' + props.join('\n  ') + '\n' : '';

  return `${variantsConst}

export function ${componentName}() {
  return (
    <motion.${tag}${propsString}>
      {/* Content */}
    </motion.${tag}>
  );
}`;
}

/**
 * Generate a hook for using animation variants
 */
export function generateAnimationHook(
  animations: CapturedAnimation[]
): string {
  const variantsByType: Record<string, FramerMotionVariant[]> = {};

  for (const animation of animations) {
    const type = animation.type;
    if (!variantsByType[type]) {
      variantsByType[type] = [];
    }
    variantsByType[type].push(convertAnimationToVariant(animation));
  }

  let code = `import { useAnimation } from 'framer-motion';\n\n`;
  code += `export function useAnimations() {\n`;
  code += `  const controls = useAnimation();\n\n`;

  for (const [type, variants] of Object.entries(variantsByType)) {
    code += `  const ${type}Variants = ${formatObject(variants[0])};\n`;
  }

  code += `\n  return {\n`;
  code += `    controls,\n`;
  for (const type of Object.keys(variantsByType)) {
    code += `    ${type}Variants,\n`;
  }
  code += `  };\n`;
  code += `}\n`;

  return code;
}
