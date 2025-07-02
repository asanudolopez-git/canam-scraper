import { YEAR_1, PART_DESCRIPTION_REGEX } from "./constants.js";

export const flatten = (arrs, callback) => arrs.reduce((acc, parts) => [...acc, ...callback(parts)], []);
export const getCurrentYear = () => new Date().getFullYear();
export const getYearRange = (start = YEAR_1, end = getCurrentYear()) => [...Array(end - start + 1).keys()].map(i => i + start);

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
  const { Description: description } = part;
  Object.entries(PART_DESCRIPTION_REGEX).forEach(([column, regex]) => {
    part[column] = regex.test(description) ? 0 : 1;
  });
  return part;
}

export const sanitizeParts = parts => parts.map(part => {
  delete part.Id;
  part['WebsitePrice1_CanAm'] = `$${parseFloat(part['WebsitePrice1_CanAm'].replace('$', '')).toFixed(2)}`;
  part.ShopPartPrice1_CanAm = null;
  part.ShopPriceList2_VanFax = null;
  part.ShopPriceList3_Benson = null;
  part.ShopPriceList4_PGW = null;
  return {
    Year: parseInt(part.Year),
    YearHref: part['MakeHref'].match(/.*nags\/\d+\//)[0],
    ...part
  };
});

export const constructId = ({ ModelHref: modelHref, BodyHref: bodyHref, PartNumber: partNumber }) => `${bodyHref || modelHref}--${partNumber}`;