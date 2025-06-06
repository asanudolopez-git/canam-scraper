import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import fs from 'fs';
import pLimit from 'p-limit';
dotenv.config();

import login from './login.js';
import { getYear, getMakes, getModels, getPartsFromModel } from './navigate.js';
import { withRetry } from './utils.js';
import config from './config.js';

let numberOfModels = 0;
let numberOfParts = 0;
let numberOfMakes = 0;
let totalRowsSaved = 0;
let buffer = [];
const year = getYear();

const completedParts = new Set();
if (fs.existsSync('scrape.log')) {
  const lines = fs.readFileSync('scrape.log', 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.trim().match(/^Saved part:\s+([A-Z0-9\-]+)$/i);
    if (match) {
      completedParts.add(match[1]);
    }
  }
}

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Pricing');
worksheet.columns = config.columns;

process.on('SIGINT', async () => {
  console.warn('\n[CTRL+C] Interrupt received. Flushing buffer and saving...');

  if (buffer.length > 0) {
    console.log(`Flushing ${buffer.length} unsaved rows...`);
    for (const row of buffer) {
      try {
        if (typeof row !== 'object' || !row.PartNumber) {
          console.warn('Skipping invalid row:', row);
          continue;
        }
        const safeRow = Object.fromEntries(
          Object.entries(row).filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
        );
        worksheet.addRow(safeRow);
      } catch (err) {
        console.error('Failed to add row:', row, err.message);
      }
    }
  }

  try {
    console.log(`Saving partial file to ${config.outputFile}...`);
    await workbook.xlsx.writeFile(config.outputFile);
    console.log(`\u2714 File saved to ${config.outputFile}`);
  } catch (err) {
    console.error(`Failed to save Excel file:`, err.message);
  }

  console.log("Exiting gracefully...");
  process.exit(0);
});

const run = async () => {
  const startTime = Date.now();
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log("Logging in...");
  await login(page);

  console.log(`Processing year: ${year.year}`);
  await withRetry(() => page.goto(year.href), 3, 1000, `Navigating to year: ${year.href}`);
  const makes = await getMakes(page);
  numberOfMakes = makes.length;
  const makeLimit = pLimit(4);
  const modelLimit = pLimit(4);

  await Promise.all(
    makes.map(make => makeLimit(async () => {
      const makePage = await browser.newPage();
      console.log(`Processing make: ${make.make}`);
      try {
        await withRetry(() => makePage.goto(make.href), 3, 1000, `Navigating to make: ${make.href}`);
        let models = [];
        try {
          models = await Promise.race([
            getModels(makePage),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout getting models')), 10000)
            )
          ]);
          numberOfModels += models.length;
          console.log(`Found ${models.length} models for make: ${make.make}`);
        } catch (err) {
          console.error(`Error getting models for ${make.make}:`, err.message);
        }
        await makePage.close();

        await Promise.all(
          models.map(model => modelLimit(async () => {
            const modelPage = await browser.newPage();
            console.log(`Processing model: ${model.model}`);
            try {
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

              const newParts = parts.filter(p => !completedParts.has(p.PartNumber));
              newParts.forEach(row => {
                fs.appendFileSync('scrape.log', `Saved part: ${row.PartNumber}\n`);
                completedParts.add(row.PartNumber);
              });
              numberOfParts += newParts.length;
              buffer.push(...newParts);

              if (buffer.length >= 100) {
                buffer.forEach(row => worksheet.addRow(row));
                buffer = [];
              }

              totalRowsSaved += newParts.length;
              console.log(`Total rows saved so far: ${totalRowsSaved}`);
            } catch (err) {
              console.error(`Error processing model ${model.model}:`, err.message);
            } finally {
              await modelPage.close();
            }
          })
          ));
      } catch (err) {
        console.error(`Error processing make ${make.make}:`, err.message);
        await makePage.close();
      }
    }))
  );

  if (buffer.length > 0) {
    buffer.forEach(row => worksheet.addRow(row));
  }
  console.log(`\u2714 Scraped ${numberOfModels} models and ${numberOfParts} parts from ${numberOfMakes} makes.`);
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Total runtime: ${duration.toFixed(2)} seconds`);
  console.log(`Saving Excel file to ${config.outputFile}...`);
  await workbook.xlsx.writeFile(config.outputFile);
  console.log("Scrape complete. Total rows saved:", totalRowsSaved);
  console.log("Closing browser.");

  await browser.close();
};

run().catch(console.error);
