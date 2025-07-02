import fs from 'fs';
import puppeteer from 'puppeteer';
import { Parser } from 'json2csv';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { YEAR_1, PART_DESCRIPTION_REGEX, PARTS_TEMPLATE } from "./constants.js";
dotenv.config();

export const toInt = (val) => isNaN(parseInt(val)) ? 0 : parseInt(val);
export const toNum = (val) => val === undefined || val === null || val.trim() === '' ? null : parseFloat(val);
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

export const withLogin = async (fn) => {
  const browser = await puppeteer.launch({
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.goto('https://www.canamautoglass.ca/?redirect=/');
  await page.type('input[name="username"]', process.env.CANAM_USER);
  await page.type('input[name="password"]', process.env.CANAM_PASS);

  await withRetry(() =>
    Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]),
    3,
    3000,
    'Login navigation'
  );

  console.log('Login successful');
  await withRetry(() => fn(page), 3, 3000, 'Executing provided function');
  await browser.close();
  console.log('Browser closed');
};

export const readCsv = (filePath, callback = null) => new Promise((resolve, reject) => {
  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', row => callback ? callback(row) : results.push(row))
    .on('end', () => resolve(results))
    .on('error', reject);
});
export const partsToCsv = (parts, fileName) => {
  const parser = new Parser({
    fields: Object.keys(PARTS_TEMPLATE),
    defaultValue: '',
    quote: '"',
    delimiter: ','
  });
  const csv = parser.parse(parts);
  fs.writeFileSync(fileName, csv, 'utf8');
};