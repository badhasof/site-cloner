/**
 * Type definitions for the animations module
 */

export interface ExtractedStyles {
  css: string;
  computedStyles: Map<string, CSSStyleDeclaration>;
  stylesheets: string[];
}

export interface CapturedAnimation {
  id: string;
  name?: string;
  type: AnimationType;
  selector: string;
  keyframes: AnimationKeyframe[];
  timing: AnimationTiming;
  trigger?: AnimationTrigger;
  element?: ElementInfo;
}

export type AnimationType =
  | 'css-animation'
  | 'css-transition'
  | 'web-animation'
  | 'scroll'
  | 'hover'
  | 'click'
  | 'viewport';

export interface AnimationKeyframe {
  offset: number; // 0 to 1
  properties: Record<string, string | number>;
  easing?: string;
}

export interface AnimationTiming {
  duration: number; // milliseconds
  delay: number; // milliseconds
  iterations: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  easing: string;
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface AnimationTrigger {
  type: 'hover' | 'click' | 'scroll' | 'viewport' | 'load';
  threshold?: number; // For scroll/viewport triggers (0-1)
  margin?: string; // For viewport triggers
  once?: boolean; // For scroll/viewport triggers
}

export interface ElementInfo {
  tag: string;
  selector: string;
  computedStyle: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface KeyframeAnimation {
  name: string;
  keyframes: AnimationKeyframe[];
}

export interface ScrollAnimation extends CapturedAnimation {
  type: 'scroll' | 'viewport';
  scrollTrigger: {
    start: number; // Scroll position or viewport percentage
    end?: number;
    scrub?: boolean;
  };
  beforeState: Record<string, string | number>;
  afterState: Record<string, string | number>;
}

export interface FramerMotionVariant {
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  exit?: Record<string, any>;
  whileHover?: Record<string, any>;
  whileTap?: Record<string, any>;
  whileInView?: Record<string, any>;
  transition?: FramerMotionTransition;
  viewport?: {
    once?: boolean;
    margin?: string;
    amount?: number | 'some' | 'all';
  };
}

export interface FramerMotionTransition {
  duration?: number;
  delay?: number;
  ease?: string | number[];
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  type?: 'tween' | 'spring' | 'inertia';
  // Spring physics
  stiffness?: number;
  damping?: number;
  mass?: number;
}

export interface AnimationResult {
  animations: CapturedAnimation[];
  framerMotionCode: string;
  cssAnimations: KeyframeAnimation[];
  scrollAnimations: ScrollAnimation[];
}

export interface CDPAnimationEvent {
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
