import { extractPartsFromTableRows } from "./utils.js";
const FIRST_YEAR = 2000;

export const getYears = () => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  return years.map(year => ({
    year,
    href: `https://www.canamautoglass.ca/nags/${year}/`
  }));
};

export const getMakes = async (page) => {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'), el => ({
      make: el.innerText.trim(),
      href: el.href
    }))
  );
};

export const getModels = async (page) => {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'), el => ({
      model: el.innerText.trim(),
      href: el.href
    }))
  );
};

export const getPartsFromModel = async (page, year, make, model) => {
  const rows = await page.$$('.vehicleTable tbody tr');
  console.log(`Found ${rows.length} parts for model: ${model.model}`);
  return await extractPartsFromTableRows(rows, year, make, model);
};
