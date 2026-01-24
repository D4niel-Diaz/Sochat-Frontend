const isDev = import.meta.env.DEV;

export const log = isDev ? console.log : () => {};
export const error = isDev ? console.error : () => {};
export const warn = isDev ? console.warn : () => {};
export const info = isDev ? console.info : () => {};
export const debug = isDev ? console.debug : () => {};
