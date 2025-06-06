import { startsWithFWorDW, extractPartsFromTableRows } from "./utils.js";

export const getYear = () => {
  const year = String(new Date().getFullYear());
  return { year, href: `https://www.canamautoglass.ca/nags/${year}/` };
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
