/**
 * Path Validation Utility
 * 
 * Provides secure path validation and normalization to prevent path traversal attacks.
 * Ensures all resolved paths stay within the intended base directory.
 */

import { resolve, normalize, isAbsolute } from 'path';

/**
 * Validates and resolves a path segment against a base directory.
 * Prevents path traversal attacks by ensuring the resolved path stays within the base directory.
 * 
 * @param {string} baseDir - The base directory to resolve against
 * @param {...string} pathSegments - The path segments to validate and resolve
 * @returns {string} The validated and resolved absolute path
 * @throws {Error} If the path attempts to escape the base directory or contains unsafe characters
 */
export function validatePath(baseDir, ...pathSegments) {
  // Join all path segments
  const pathSegment = pathSegments.join('/');
  
  // Reject absolute paths
  if (isAbsolute(pathSegment)) {
    throw new Error(`Absolute paths are not allowed: ${pathSegment}`);
  }

  // Reject paths with null bytes (security risk)
  if (pathSegment.includes('\0')) {
    throw new Error(`Path contains null byte: ${pathSegment}`);
  }

  // Normalize the path segment to remove redundant separators and resolve . and ..
  const normalizedSegment = normalize(pathSegment);

  // Check for attempts to escape using .. at the start
  if (normalizedSegment.startsWith('..')) {
    throw new Error(`Path attempts to escape base directory: ${pathSegment}`);
  }

  // Resolve the full path
  const resolvedBase = resolve(baseDir);
  const resolvedPath = resolve(resolvedBase, normalizedSegment);

  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(resolvedBase + '/') && resolvedPath !== resolvedBase) {
    throw new Error(`Path escapes base directory: ${pathSegment} -> ${resolvedPath}`);
  }

  return resolvedPath;
}

/**
 * Creates a path validator function bound to a specific base directory.
 * Useful for repeated validations against the same base.
 * 
 * @param {string} baseDir - The base directory to use for all validations
 * @returns {Function} A function that validates paths against the base directory
 */
export function createPathValidator(baseDir) {
  const resolvedBase = resolve(baseDir);
  
  return (pathSegment) => validatePath(resolvedBase, pathSegment);
}
