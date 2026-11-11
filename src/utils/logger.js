// Console logging in development only; silent in production builds.
const isDev = import.meta.env.DEV;

const make = (method) => (...args) => {
  if (isDev) console[method](...args);
};

export const log = make("log");
export const error = make("error");
export const warn = make("warn");
export const info = make("info");
export const debug = make("debug");
