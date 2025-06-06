import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'fs';
import pLimit from 'p-limit';
dotenv.config();

import login from './login.js';
import { getYears, getMakes, getModels, getPartsFromModel } from './navigate.js';
import { withRetry } from './utils.js';
import config from './config.js';

let numberOfYears = 0;
let numberOfMakes = 0;
let numberOfModels = 0;
let numberOfParts = 0;
let totalRowsSaved = 0;
const yearLimit = pLimit(3);
const makeLimit = pLimit(3);
const modelLimit = pLimit(3);
let buffer = [];
const fileName = `${config.outputFile}.json`;

const completedYears = [];
const completedMakes = [];
const completedParts = new Set();
if (fs.existsSync('scrape.log')) {
  const lines = fs.readFileSync('scrape.log', 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.trim().match(/^Saved (.*):\s+([A-Z0-9\/\-]+)$/i);
    if (match) {
      switch (match[1]) {
        case 'year':
          completedYears.push(match[2]);
          break;
        case 'yearMake':
          completedMakes.push(match[2]);
          break;
        case 'part':
          completedParts.add(match[2]);
          break;
        default:
          console.warn('Unknown saved type:', match[1]);
          break;
      }
    }
  }
}

fs.writeFileSync(fileName, '[\n');

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
        const jsonLine = JSON.stringify(row) + ',\n';
        fs.appendFileSync(fileName, jsonLine);
      } catch (err) {
        console.error('Failed to add row:', row, err.message);
      }
    }
  }
  fs.appendFileSync(fileName, '{}\n]');
  console.log("Exiting gracefully...");
  process.exit(0);
});

const run = async () => {
  const startTime = Date.now();
  const years = getYears()
    .filter(y => !completedYears.includes(String(y.year)));
  numberOfYears = years.length;
  if (completedYears.size > 0) {
    console.log(`Skipping Years: ${completedYears.joins(', ')}`);
  };
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log("Logging in...");
  await login(page);

  await Promise.all(
    years.map(year => yearLimit(async () => {
      console.log(`Processing year: ${year.year}`);
      const yearPage = await browser.newPage();
      try {
        await withRetry(() => yearPage.goto(year.href), 3, 1000, `Navigating to year: ${year.href}`);
        let makes = await getMakes(yearPage)
        makes = makes.filter(m => !completedMakes.includes(String(m.make)));
        numberOfMakes += makes.length;
        console.log(`Found ${makes.length} makes for year: ${year.year}.`);
        if (completedMakes.size > 0) {
          console.log(`Skipping Makes: ${completedMakes.joins(', ')}`);
        };
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
                ])
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
                      numberOfParts += parts.length;
                      console.log(`Found ${parts.length} parts for ${model.model}`);
                    } catch (err) {
                      console.error(`Error scraping model ${model.model}:`, err.message);
                    }

                    const newParts = parts.filter(part => !completedParts.has(part.PartNumber));
                    newParts.forEach(row => {
                      fs.appendFileSync('scrape.log', `Saved part: ${row.PartNumber}\n`);
                      completedParts.add(row.PartNumber);
                    });
                    buffer.push(...newParts);

                    if (buffer.length >= 100) {
                      buffer.forEach(row => {
                        const jsonLine = JSON.stringify(row) + ',\n';
                        fs.appendFileSync(fileName, jsonLine);
                      });
                      buffer = [];
                    }

                    totalRowsSaved += newParts.length;
                  } catch (err) {
                    console.error(`Error processing model ${model.model}:`, err.message);
                  } finally {
                    await modelPage.close();
                  }
                }))
              );
              fs.appendFileSync('scrape.log', `Saved yearMake: ${year.year}/${make.make}\n`);
              console.log(`Completed processing make: ${make.make}`);
            } catch (err) {
              console.error(`Error processing make ${make.make}:`, err.message);
            } finally {
              await makePage.close();
            }
          }))
        );

        fs.appendFileSync('scrape.log', `Saved year: ${year.year}\n`);
        console.log(`Completed processing year: ${year.year}`);
      } catch (err) {
        console.error(`Error processing year ${year.year}:`, err.message);
      } finally {
        await yearPage.close();
      }
    }))
  );

  if (buffer.length > 0) {
    buffer.forEach(row => {
      const jsonLine = JSON.stringify(row) + ',\n';
      fs.appendFileSync(fileName, jsonLine);
    });
  }
  console.log(`\u2714 Scraped ${numberOfModels} models and ${numberOfParts} parts from ${numberOfMakes} makes.`);
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Total runtime: ${duration.toFixed(2)} seconds`);
  console.log(`Saving JSON file to ${fileName}...`);
  fs.appendFileSync(fileName, '{}\n]');
  console.log("Scrape complete. Total rows saved:", totalRowsSaved);
  console.log("Closing browser.");
  await browser.close();
};

run().catch(console.error);