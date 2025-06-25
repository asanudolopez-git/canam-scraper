import { withRetry } from "./utils.js";

import { YEAR_1, CURRENT_YEAR, CANAM_BASE_URL, PART_NUMBER_REGEX } from "./constants.js";

const getModelHrefsForMake = async (page) => {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'))
      .reduce((acc, el) => ({ ...acc, [el.innerText.trim()]: { href: el.href } }), {})
  );
};

const getMakeHrefsForYear = async (page) => {
  const makes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'))
      .reduce((acc, el) => ({ ...acc, [el.innerText.trim()]: { href: el.href, models: {} } }), {})
  );
  for (const m of Object.entries(makes)) {
    const [make, { href }] = m;
    console.log(`Processing make: ${make}...`);
    await withRetry(() => page.goto(href), 3, 1000, `Navigating to make: ${make}`);
    const models = await getModelHrefsForMake(page);
    console.log(`Found ${Object.keys(models).length} models for make: ${make}.`)
    makes[make] = {
      href,
      models
    };
  }
  return makes;
};

export const getHrefsForYears = async (start = YEAR_1, end = CURRENT_YEAR, page) => {
  const hrefs = {}
  const years = [...Array(end - start + 1).keys()].map(i => i + start);
  console.log(`Processing years from ${start} to ${end}.`);
  for (const year of years) {
    const href = `${CANAM_BASE_URL}${year}/`;
    console.log(`Processing year: ${year}...`);
    await withRetry(() => page.goto(href), 3, 1000, `Navigating to year: ${year}`);
    const makes = await getMakeHrefsForYear(page);
    console.log(`Found ${Object.keys(makes).length} makes for year: ${year}.`);
    hrefs[year] = {
      href,
      makes
    };
  }
  return hrefs;
};

export const getPartsFromModelHref = async (page, href) => {
  console.log({ page, href });
  await withRetry(() => page.goto(href), 3, 1000, `Navigating to href: ${href}`);
  console.log({ rows });
  const rows = await page.$$('.vehicleTable tbody tr');
  const parts = [];
  for (const row of rows) {
    try {
      // Only add rows that have a part number link
      const partNumber = await row.$eval('.partNumber a', el => el && el.innerText.trim());
      if (!PART_NUMBER_REGEX.test(partNumber)) { continue; };

      const description = await row.$eval('.description', el => el.innerText.trim());
      // Ignore MSRP
      const price = await row.$eval('.price', el => el.innerText.trim().split(/\s+/)[0]);
      const availability = await row.$eval('.availability', element => element.innerText.trim());
      const ships = await row.$eval('.ships', element => element.innerText.trim());

      parts.push({
        PartNumber: partNumber,
        Description: description,
        WebsitePrice1_CanAm: price,
        Availability: availability,
        Ships: ships
      })
    } catch (error) {
      console.error(`Error processing row: ${error.message}`);
      continue; // Skip this row and continue with the next one
    }
  }
  return parts;
};
