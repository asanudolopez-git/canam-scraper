import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs, { readFile } from 'fs';
dotenv.config();

import login from './login.js';
import { getYears, getMakes, getModels, getPartsFromModel } from './navigate.js';
import { withRetry } from './utils.js';
import config from './config.js';


const main = async () => {
  const scrapeJSON = {};
  if (fs.existsSync('scrape.json')) {
    await readFile('scrape.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading scrape.json:', err);
        return;
      }
      const scrapeJSON = JSON.parse(data);
      console.log(`Loaded existing scrape data with ${Object.keys(scrapeJSON).length} entries`);
    });
  } else {
    console.log('No existing scrape data found, starting fresh.');
    fs.writeFileSync('scrape.json', JSON.stringify({}));
  };

  const buffer = {
    scraped: (id) => scrapeJSON[id] = true,
    data: [],
    flush() {
      this.data.forEach(part => this.scraped(part.PartNumber));
      fs.writeFileSync('parts.json', JSON.stringify({ data: this.data }, null, 2));
      fs.writeFileSync('scrape.json', JSON.stringify(scrapeJSON, null, 2));
    },
    push(data) {
      console.log(`Pushing data for part: ${data.PartNumber}`);
      this.data.push(data);
      if (this.data.length >= 10) {
        this.flush();
      }
    },
  };

  process.on('SIGINT', async () => {
    console.warn('\n[CTRL+C] Interrupt received. Flushing buffer and saving...');
    buffer.flush();
    console.log("Exiting gracefully...");
    process.exit(0);
  });

  const years = getYears();
  console.log(`Found ${years.length} years to process.`);
  const browser = await puppeteer.launch({
    headless: 'new',
  });
  const page = await browser.newPage();
  await login(page);
  console.log('Logged in successfully.');


  const processYearMakeModelParts = async (yearMakeModelPage, year, make, model) => {
    const yearMakeModelId = `${year.year}/${make.make}/${model.model}`;
    try {
      const parts = await getPartsFromModel(yearMakeModelPage, year, make, model)
      console.log(`Found ${parts.length} parts for yearMakeModel: ${yearMakeModelId}.`);
      for (const part of parts) {
        buffer.push && buffer.push(part);
      }
      return parts;
    } catch (err) {
      console.error(`Error getting parts for yearMakeModel: ${yearMakeModelId}`, err);
    }
  };

  const processYearMakeModels = async (yearMakePage, year, make) => {
    const models = await getModels(yearMakePage);
    console.log(`Found ${models.length} models for yearMake: ${year.year}/${make.make}.`);
    for (const model of models) {
      const id = `${year.year}/${make.make}/${model.model}`;
      if (scrapeJSON[id]) {
        console.log(`Skipping model ${id} as it has already been processed.`);
        continue;
      }
      console.log(`Processing yearMakeModel: ${id}`);
      const page = await browser.newPage();
      try {
        await withRetry(() => page.goto(model.href), 3, 1000, `Navigating to yearMakeModel: ${id}`);
        const parts = await processYearMakeModelParts(page, year, make, model, scrapeJSON);
        console.log(`Found ${parts.length} parts for yearMakeModel: ${id}.`);
        scrapeJSON[id] = true;
        return parts;
      } catch (err) {
        console.error(`Error processing yearMakeModel: ${id}`, err);
      }
    };
  };

  const processYearMakes = async (yearPage, year) => {
    const makes = await getMakes(yearPage);
    console.log(`Found ${makes.length} makes for year: ${year.year}.`);
    for (const make of makes) {
      const id = `${year.year}/${make.make}`;
      if (scrapeJSON[id]) {
        console.log(`Skipping yearMake ${id} as it has already been processed.`);
        continue;
      }
      console.log(`Processing yearMake: ${id}`);
      const page = await browser.newPage();
      try {
        await withRetry(() => page.goto(make.href), 3, 1000, `Navigating to yearMake: ${id}`);
        const models = await processYearMakeModels(page, year, make, scrapeJSON);
        // console.log(`Found ${models.length} models for yearMake: ${id}.`);
        scrapeJSON[id] = true;
      } catch (err) {
        console.error(`Error processing yearMake: ${id}`, err);
      }
    };
  };

  const processYears = async (years = []) => {
    for (const year of years) {
      const id = year.year;
      if (scrapeJSON[id]) {
        console.log(`Skipping year ${id} as it has already been processed.`);
        continue;
      }
      console.log(`Processing year: ${id}`);
      const page = await browser.newPage();
      try {
        await withRetry(() => page.goto(year.href), 3, 1000, `Navigating to year: ${id}`);
        const yearMakes = await processYearMakes(page, year, scrapeJSON);
        // console.log(`Found ${yearMakes.length} makes for year: ${id}.`);
        scrapeJSON[id] = true;
      } catch (err) {
        console.error(`Error processing year: ${id}`, err);
      }
    };
  };

  try {
    await processYears(years);
    console.log('Finished processing all years.');
  } catch (err) {
    console.error('Error during processing:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
  buffer.flush();
  // fs.writeFileSync('scrape.json', JSON.stringify(scrapeJSON, null, 2));
  console.log('Scrape data saved to scrape.json');
};

main().catch(err => {
  console.error('Error in main function:', err);
})