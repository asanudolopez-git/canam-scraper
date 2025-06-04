// /scraper/index.js
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
dotenv.config();

import login from './login.js';
import { getYears, getMakes, getModels, getPartsFromModel } from './navigate.js';
import { withRetry, saveChunk } from './utils.js';
import config from './config.js';

let totalRowsSaved = 0;

const run = async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Logging in...");
  await login(page);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pricing');
  worksheet.columns = config.columns;

  console.log("Fetching years...");
  const years = await getYears(page);

  if (!years || years.length === 0) {
    console.error("No year data found. Exiting...");
    await browser.close();
    return;
  }

  for (const year of years) {
    console.log(`Processing year: ${year.year}`);
    await withRetry(() => page.goto(year.href), 3, 1000, `Navigating to year: ${year.href}`);
    const makes = await getMakes(page);

    for (const make of makes) {
      console.log(`Processing make: ${make.make}`);
      await withRetry(() => page.goto(make.href), 3, 1000, `Navigating to make: ${make.href}`);
      const models = await getModels(page);

      for (const model of models) {
        console.log(`Processing model: ${model.model}`);
        await withRetry(() => page.goto(model.href), 3, 1000, `Navigating to model: ${model.href}`);
        const parts = await getPartsFromModel(page, year, make, model);

        console.log(`Found ${parts.length} parts for ${model.model}`);
        saveChunk(parts, worksheet);
        totalRowsSaved += parts.length;
        console.log(`Total rows saved so far: ${totalRowsSaved}`);
      }
    }
  }

  console.log(`Saving Excel file to ${config.outputFile}...`);
  await workbook.xlsx.writeFile(config.outputFile);
  console.log("Scrape complete. Total rows saved:", totalRowsSaved);
  console.log("Closing browser.");
  await browser.close();
};

run().catch(console.error);
