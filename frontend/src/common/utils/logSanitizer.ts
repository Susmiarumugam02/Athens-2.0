const isDev = import.meta.env.DEV;

export const safeLog = {
  debug: (...args: any[]) => { if (isDev) console.debug(...args); },
  info: (...args: any[]) => { if (isDev) console.info(...args); },
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};

export default safeLog;
