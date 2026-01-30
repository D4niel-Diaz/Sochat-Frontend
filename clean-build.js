#!/usr/bin/env node

/**
 * Cross-platform clean build script
 * Removes Vite cache and dist folder before building
 */

import { rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pathsToClean = [
  join(__dirname, 'node_modules', '.vite'),
  join(__dirname, 'dist'),
];

console.log('🧹 Cleaning build cache...');

pathsToClean.forEach(path => {
  try {
    rmSync(path, { recursive: true, force: true });
    console.log(`✅ Removed: ${path}`);
  } catch (error) {
    // Ignore if path doesn't exist
    if (error.code !== 'ENOENT') {
      console.warn(`⚠️  Could not remove ${path}:`, error.message);
    }
  }
});

console.log('✅ Clean complete. Starting build...');
