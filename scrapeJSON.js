import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

import login from './login.js';
import { getYears, getMakes, getModels, getPartsFromModel } from './navigate.js';
import { withRetry } from './utils.js';
import config from './config.js';

const processYearMakeModelParts = async (yearMakeModelPage, year, make, model, buffer = {}) => {
  const yearMakeModelId = `${year.year}/${make.make}/${model.model}`;
  try {
    const parts = await getPartsFromModel(yearMakeModelPage, year, make, model)
    parts.forEach(part => {
      fs.appendFileSync('scrape.log', `Saved part: ${part.PartNumber}\n`);
      buffer.push && buffer.push(part);
    });
  } catch (err) {
    console.error(`Error getting parts for yearMakeModel: ${yearMakeModelId}`, err);
    return [];
  }
  console.log(`Found ${parts.length} parts for yearMakeModel: ${yearMakeModelId}.`);
};

const processYearMakeModels = async (yearMakePage, year, make, buffer = {}) => {
  const models = await getModels(yearMakePage);
  console.log(`Found ${models.length} models for yearMake: ${yearMake}.`);
  for (const model of models) {
    const id = `${year.year}/${make.make}/${model.model}`;
    console.log(`Processing yearMakeModel: ${id}`);
    const page = await browser.newPage();
    try {
      await withRetry(() => page.goto(make.href), 3, 1000, `Navigating to yearMakeModel: ${id}`);
      const parts = await processYearMakeModelParts(page, year, make, model);
      console.log(`Found ${parts.length} parts for yearMakeModel: ${id}.`);
      fs.appendFileSync('scrape.log', `Saved yearMakeModel: ${id}\n`);
    } catch (err) {
      console.error(`Error processing yearMakeModel: ${id}`, err);
      return [];
    }
  };
};

const processYearMakes = async (yearPage, year, buffer = {}) => {
  const makes = await getMakes(yearPage);
  console.log(`Found ${makes.length} makes for year: ${year.year}.`);
  for (const make of makes) {
    const id = `${year.year}/${make.make}`;
    console.log(`Processing yearMake: ${id}`);
    const page = await browser.newPage();
    try {
      await withRetry(() => page.goto(make.href), 3, 1000, `Navigating to yearMake: ${id}`);
      const models = await processYearMakeModels(page, year, make);
      console.log(`Found ${models.length} models for yearMake: ${id}.`);
      fs.appendFileSync('scrape.log', `Saved yearMake: ${id}\n`);
    } catch (err) {
      console.error(`Error processing yearMake: ${id}`, err);
      return [];
    }
  };
};

const processYears = async (years = [], buffer = {}) => {
  for (const year of years) {
    const id = year.year;
    console.log(`Processing year: ${id}`);
    const page = await browser.newPage();
    try {
      await withRetry(() => page.goto(year.href), 3, 1000, `Navigating to year: ${id}`);
      const yearMakes = await processYearMakes(page, year);
      console.log(`Found ${makes.length} makes for year: ${id}.`);
      fs.appendFileSync('scrape.log', `Saved year: ${id}\n`);
    } catch (err) {
      console.error(`Error processing year: ${id}`, err);
      return [];
    }
  };
};

const startTime = Date.now();

let numberOfYears = 0;
let numberOfMakes = 0;
let numberOfModels = 0;
let numberOfParts = 0;
let totalRowsSaved = 0;
const yearLimit = pLimit(1);
const makeLimit = pLimit(1);
const modelLimit = pLimit(1);
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
if (!fs.existsSync(fileName)) {
  fs.writeFileSync(fileName, '[\n');
} else {
  const lastChar = fs.readFileSync(fileName, 'utf-8').trim().slice(-1);
  if (lastChar !== ']') {
    console.warn(`Warning: ${fileName} does not end with ']', appending it now.`);
    // fs.appendFileSync(fileName, '{}\n]');
  } else {
    console.log(`Resuming from existing file: ${fileName}`);
  }
}

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
        fs.appendFileSync('scrape.log', `Saved part: ${row.PartNumber}\n`);
        fs.appendFileSync(fileName, jsonLine);
      } catch (err) {
        console.error('Failed to add row:', row, err.message);
      }
    }
  }
  // fs.appendFileSync(fileName, '{}\n]');
  console.log(`Total runtime: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
  console.log("Exiting gracefully...");
  process.exit(0);
});

const run = async () => {
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
        makes = makes.filter(m => !completedMakes.includes(`${year}/${m.make}`));
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
              console.log(`Completed processing yearMake: ${make.make}`);
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
  console.log(`\u2714 Scraped ${numberOfYears} years, ${numberOfModels} models and ${numberOfParts} parts from ${numberOfMakes} makes.`);
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Total runtime: ${duration.toFixed(2)} seconds`);
  console.log(`Saving JSON file to ${fileName}...`);
  fs.appendFileSync(fileName, '{}\n]');
  console.log("Scrape complete. Total rows saved:", totalRowsSaved);
  console.log("Closing browser.");
  await browser.close();
};

run().catch(console.error);