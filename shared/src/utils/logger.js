// shared/src/utils/logger.js
const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  debug: (...args) => {
    if (!isProduction) {
      console.debug(...args);
    }
  },
  log: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (!isProduction) {
      console.error(...args);
    }
    // In production, we can send to an error reporting service
    // For now, we do nothing to avoid console.error in production
  }
};

export default logger;
