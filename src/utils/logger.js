// CRITICAL: Check environment at runtime, not build time
// This prevents minification issues where isDev becomes undefined
const isDev = (() => {
  try {
    // Check if we're in development mode
    // import.meta.env.DEV is replaced by Vite at build time
    // But we need a runtime check as fallback
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.DEV === true || import.meta.env.MODE === 'development';
    }
    // Fallback: check if we're in a development environment
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1');
  } catch {
    return false;
  }
})();

// Safe logger functions that work in both dev and production
// Using function declarations to avoid minification issues
// CRITICAL: Always define functions, even if they're no-ops in production
export function log(...args) {
  if (isDev) {
    try {
      if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log(...args);
      }
    } catch (e) {
      // Silently fail if console is not available
    }
  }
}

export function error(...args) {
  if (isDev) {
    try {
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error(...args);
      }
    } catch (e) {
      // Silently fail if console is not available
    }
  }
}

export function warn(...args) {
  if (isDev) {
    try {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(...args);
      }
    } catch (e) {
      // Silently fail if console is not available
    }
  }
}

export function info(...args) {
  if (isDev) {
    try {
      if (typeof console !== 'undefined' && typeof console.info === 'function') {
        console.info(...args);
      }
    } catch (e) {
      // Silently fail if console is not available
    }
  }
}

export function debug(...args) {
  if (isDev) {
    try {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(...args);
      }
    } catch (e) {
      // Silently fail if console is not available
    }
  }
}
