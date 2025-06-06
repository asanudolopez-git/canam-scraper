import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
// import pLimit from 'p-limit';
import fs from 'fs';
dotenv.config();

import login from './login.js';
import { getYear, getMakes, getModels, getPartsFromModel } from './navigate.js';
import { withRetry } from './utils.js';
import config from './config.js';

let totalRowsSaved = 0;
let buffer = [];
const year = getYear();

const completedParts = new Set();
// add make and model limits to scrape.log to skip already scraped parts
if (fs.existsSync('scrape.log')) {
  const lines = fs.readFileSync('scrape.log', 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const singleLine = line.match(/^Saved part:\s+([A-Z0-9\-]+)$/i);
    if (singleLine) {
      completedParts.add(singleLine[1]);
      continue;
    }
  }
}

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Pricing');
worksheet.columns = config.columns;

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.warn('Process interrupted. Flushing buffer and saving file...');
  console.log({ buffer, totalRowsSaved, completedParts });
  (async () => {
    if (buffer.length > 0) {
      for (const row of buffer) {
        try {
          if (typeof row !== 'object' || !row.PartNumber) {
            console.warn('⚠️ Skipping invalid row:', row);
            continue;
          }

          // Strip unexpected fields
          const safeRow = Object.fromEntries(
            Object.entries(row).filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
          );

          worksheet.addRow(safeRow);
        } catch (err) {
          console.error('Failed to add row:', row, err.message);
        }
      }
    }
    console.log(`Saving partial file to ${config.outputFile}...`);
    await Promise.race([
      workbook.xlsx.writeFile(config.outputFile),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Excel save timeout')), 10000))
    ]);
    console.log(`Partial file saved to ${config.outputFile}`);
    console.log("Exiting gracefully...");
    process.exit();
  })();
});

const run = async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log("Logging in...");
  await login(page);

  console.log(`Processing year: ${year.year}`);
  await withRetry(() => page.goto(year.href), 3, 1000, `Navigating to year: ${year.href}`);
  const makes = await getMakes(page);

  let makeCount = 0;
  for (const make of makes) {
    if (makeCount > 2) {
      console.log(`Skipping make ${make.make} due to makeCount limit ${makeCount}`);
      continue;
    }
    makeCount++;
    const makePage = await browser.newPage();
    console.log(`Processing make: ${make.make}`);
    await withRetry(() => makePage.goto(make.href), 3, 1000, `Navigating to make: ${make.href}`);
    let models = [];
    try {
      models = await Promise.race([
        getModels(makePage),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout getting models')), 10000)
        )
      ]);
      console.log(`Found ${models.length} models for make: ${make.make}`);
    } catch (err) {
      console.error(`Error getting models for ${make.make}:`, err.message);
    }
    let modelCount = 0;
    for (const model of models) {
      if (modelCount > 2) {
        console.log(`Skipping model ${model.model} due to modelCount limit ${modelCount}`);
        continue;
      }
      modelCount++;
      const modelPage = await browser.newPage();
      console.log(`Processing model: ${model.model}`);
      await withRetry(() => modelPage.goto(model.href), 3, 1000, `Navigating to model: ${model.href}`);
      let parts = [];
      try {
        console.log(`Scraping parts for model: ${model.model}`);
        parts = await Promise.race([
          getPartsFromModel(modelPage, year, make, model).catch(err => {
            console.error(`getPartsFromModel() threw for ${model.model}:`, err.message);
            return [];
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout getting parts')), 15000)
          )
        ]);
        console.log(`Found ${parts.length} parts for ${model.model}`);
      } catch (err) {
        console.error(`Error scraping model ${model.model}:`, err.message);
      }
      await modelPage.close();

      const newParts = parts.filter(p => !completedParts.has(p.PartNumber));
      newParts.forEach(row => {
        fs.appendFileSync('scrape.log', `Saved part: ${row.PartNumber}\n`);
        completedParts.add(row.PartNumber);
      });
      buffer.push(...newParts);

      if (buffer.length >= 100) {
        buffer.forEach(row => worksheet.addRow(row));
        buffer = [];
      }

      totalRowsSaved += newParts.length;
      console.log(`Total rows saved so far: ${totalRowsSaved}`);
    }
  }

  if (buffer.length > 0) {
    buffer.forEach(row => worksheet.addRow(row));
  }

  console.log(`Saving Excel file to ${config.outputFile}...`);
  await workbook.xlsx.writeFile(config.outputFile);
  console.log("Scrape complete. Total rows saved:", totalRowsSaved);
  console.log("Closing browser.");
  await browser.close();
};

run().catch(console.error);
