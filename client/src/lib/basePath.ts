// Base path utility for subpath deployment support
const BASE_PATH = import.meta.env.BASE_URL || '/';

// Remove trailing slash for consistency
const NORMALIZED_BASE = BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');

/**
 * Get the base path for routes
 * Returns empty string for root deployment, or the base path without trailing slash
 */
export function getBasePath(): string {
  return NORMALIZED_BASE;
}

/**
 * Prefix a path with the base path
 * @param path - The path to prefix (e.g., "/dashboard")
 * @returns The prefixed path (e.g., "/tempmail/dashboard" or "/dashboard")
 */
export function withBasePath(path: string): string {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return NORMALIZED_BASE + path;
}

/**
 * Get the API base path
 * Returns "/api" for root deployment, or "/tempmail/api" for subpath deployment
 */
export function getApiBasePath(): string {
  return NORMALIZED_BASE + '/api';
}
