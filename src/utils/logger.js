const isDev = import.meta.env.DEV;

// Safe logger functions that work in both dev and production
// Using function declarations to avoid minification issues
export function log(...args) {
  if (isDev && typeof console !== 'undefined' && console.log) {
    console.log(...args);
  }
}

export function error(...args) {
  if (isDev && typeof console !== 'undefined' && console.error) {
    console.error(...args);
  }
}

export function warn(...args) {
  if (isDev && typeof console !== 'undefined' && console.warn) {
    console.warn(...args);
  }
}

export function info(...args) {
  if (isDev && typeof console !== 'undefined' && console.info) {
    console.info(...args);
  }
}

export function debug(...args) {
  if (isDev && typeof console !== 'undefined' && console.debug) {
    console.debug(...args);
  }
}
