import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
import withLogin from './withLogin.js';
import config from './config.js';
import { getPartsFromModelHref } from './navigation.js';
// import { YEAR_1, CURRENT_YEAR } from './constants.js';

const scrapeParts = async () => {
  withLogin(async page => {
    // const startYear = process.env.YEAR_1 || YEAR_1;
    // const endYear = process.env.END_YEAR || CURRENT_YEAR;
    // const years = [...Array(endYear - startYear + 1).keys()].map(i => i + startYear);
    const years = [2025]; // For testing, you can set this to a specific year or range

    const modelsByYear = JSON.parse(fs.readFileSync(config.modelsByYear, 'utf8'));
    const partsByYear = {};
    years.forEach(year => {
      const models = modelsByYear[year] || [];
      if (models.length === 0) { return; }
      const partsForYear = [];
      console.log(`Scraping parts for ${models.length} models for year ${year}...`);
      [models[0]].forEach(async model => {
        const href = model.ModelHref;
        console.log(`Scraping parts for model: ${model.Model} (${href})`);
        const parts = await getPartsFromModelHref(page, href);
        console.log(`Found ${parts.length} parts for model ${model.ModelName}.`);
        partsForYear.push(
          ...parts.map(
            part => ({ ...model, ...part })
          )
        );
      });
      partsByYear[year] = partsForYear;
      console.log(`Found ${partsForYear.length} parts for year ${year}.`);
    });

    fs.writeFileSync(config.partsByYear, JSON.stringify(partsByYear, null, 2));
    console.log(`Parts scraped and saved to ${config.partsByYear}`);
  });
}
scrapeParts();