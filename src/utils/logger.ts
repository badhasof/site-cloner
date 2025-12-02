/**
 * Logger utilities for consistent logging
 */

export function logInfo(message: string): void {
  console.log(`[INFO] ${message}`);
}

export function logError(message: string): void {
  console.error(`[ERROR] ${message}`);
}

export function logWarning(message: string): void {
  console.warn(`[WARN] ${message}`);
}
