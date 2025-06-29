import { withRetry, getCurrentYear, constructPart } from './utils.js';
import { YEAR_1, CANAM_BASE_URL, PART_NUMBER_REGEX } from './constants.js';

const CURRENT_YEAR = getCurrentYear();

export const getPartsFromVehicleHref = async (page, href) => {
  await withRetry(() => page.goto(href), 3, 1000, `Navigating to href: ${href}`);
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
      const part = constructPart({
        PartNumber: partNumber,
        Description: description,
        WebsitePrice1_CanAm: price,
        Availability: availability,
        Ships: ships
      })
      parts.push(part);
    } catch (error) {
      continue; // Skip this row and continue with the next one
    }
  }
  return parts;
};

export const getBodyStyleHrefsForModel = async page => {
  // debugger;
  console.log('CODE document.documentElement.innerHTML: ', document.documentElement.innerHTML);
  try {
    return await page.evaluate(() => {
      console.log('CODE EVALUATE document.documentElement.innerHTML: ', document.documentElement.innerHTML);
      const bodyStyles = Array.from(document.querySelectorAll('.list-group-item.nagsPill'))
        .reduce((acc, el) => ({ ...acc, [el.innerText.trim()]: { href: el.href } }), {})
      console.log('CODE EVALUATE bodyStyles', bodyStyles)
      return bodyStyles;
    });
    // return await page.evaluate(() =>
    //   Array.from(document.querySelectorAll('.list-group-item.nagsPill'))
    //     .reduce((acc, el) => ({ ...acc, [el.innerText.trim()]: { href: el.href } }), {})
    // );
  } catch (e) {
    console.log("Error processing bodyStyles", e.message)
    throw e;
  }
}

export const getModelHrefsForMake = async page => {
  const models = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'))
      .reduce((acc, el) => ({ ...acc, [el.innerText.trim()]: { href: el.href } }), {})
  );
  for (const m of Object.entries(models)) {
    try {
      const [model, { href }] = m;
      console.log(`Processing model: ${model}...`);
      await withRetry(() => page.goto(href), 3, 1000, `Navigating to model: ${model}`);
      const bodyStyles = await getBodyStyleHrefsForModel(page);
      models[model] = {
        href,
        bodyStyles
      }

      console.log(`Found ${Object.keys(bodyStyles).length} bodyStyles for model: ${model}.`)
    } catch (e) {
      console.log(`Error processing model: ${model}`, e.message);
      continue;
    }
  }
  return models;
};

export const getMakeHrefsForYear = async page => {
  const makes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'))
      .reduce((acc, el) => ({ ...acc, [el.innerText.trim()]: { href: el.href, models: {} } }), {})
  );
  for (const m of Object.entries(makes)) {
    try {
      const [make, { href }] = m;
      console.log(`Processing make: ${make}...`);
      await withRetry(() => page.goto(href), 3, 1000, `Navigating to make: ${make}`);
      const models = await getModelHrefsForMake(page);
      makes[make] = {
        href,
        models
      };
      console.log(`Found ${Object.keys(models).length} models for make: ${make}.`)
    } catch (e) {
      console.log(`Error processing make: ${make}`, e.message);
      continue;
    }
  }
  return makes;
};

export const getHrefsForYears = async (start = YEAR_1, end = CURRENT_YEAR, page, hrefs = {}) => {
  const years = [...Array(end - start + 1).keys()].map(i => i + start);
  console.log(`Processing years from ${start} to ${end}.`);
  for (const year of years) {
    if (hrefs[year]) {
      console.log(`${year} has already been done, skipping...`)
      continue;
    }

    try {
      const href = `${CANAM_BASE_URL}${year}/`;
      console.log(`Processing year: ${year}...`);
      await withRetry(() => page.goto(href), 3, 1000, `Navigating to year: ${year}`);
      const makes = await getMakeHrefsForYear(page);
      console.log({ makes })
      hrefs[year] = {
        href,
        makes
      };
      console.log(`Found ${Object.keys(makes).length} makes for year: ${year}.`);
    } catch (e) {
      console.log(`Error processing year: ${year}`, e.message);
      continue;
    }
  }
  return hrefs;
};