import { YEAR_1 } from "./constants.js";

export const withRetry = async (fn, retries = 3, delay = 1000, label = '') => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed for ${label || 'task'}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
};

export const getCurrentYear = () => new Date().getFullYear();
export const getYearRange = (start = YEAR_1, end = getCurrentYear()) => [...Array(end - start + 1).keys()].map(i => i + start);