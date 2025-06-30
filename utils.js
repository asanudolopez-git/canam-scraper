import { YEAR_1, PART_DESCRIPTION_REGEX } from "./constants.js";

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

export const constructPart = part => {
  const { Description: description, WebsitePrice1_CanAm: price } = part;
  Object.entries(PART_DESCRIPTION_REGEX).forEach(([column, regex]) => {
    part[column] = regex.test(description) ? 0 : 1;
  });
  part['WebsitePrice1_CanAm'] = price.replace('$', '')
  return part;
}

export const countParts = partsByVehicle => {
  let partsCount = 0;
  for (const parts of Object.values(partsByVehicle)) {
    partsCount += parts.length;
  }
  return partsCount;
}
export const getCurrentYear = () => new Date().getFullYear();
export const getYearRange = (start = YEAR_1, end = getCurrentYear()) => [...Array(end - start + 1).keys()].map(i => i + start);