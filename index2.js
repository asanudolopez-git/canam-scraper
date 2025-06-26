import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
import withLogin from './withLogin.js';
import config from './config.js';
import { getPartsFromModelHref } from './navigation.js';
// import { YEAR_1, CURRENT_YEAR } from './constants.js';

const scrapeParts = async () => {
  withLogin(async page => {
    // const parts = await getPartsFromModelHref(page, 'https://www.canamautoglass.ca/nags/2000/ACURA/5');
    // console.log(parts);
    // process.exit(1);
    // const startYear = process.env.YEAR_1 || YEAR_1;
    // const endYear = process.env.END_YEAR || CURRENT_YEAR;
    // const years = [...Array(endYear - startYear + 1).keys()].map(i => i + startYear);
    const years = [2025]; // For testing, you can set this to a specific year or range

    const modelsByYear = JSON.parse(fs.readFileSync(config.modelsByYear, 'utf8'));
    const partsByModel = JSON.parse(fs.readFileSync(config.partsByModel, 'utf8')) || {};
    for (const year of years) {
      const models = modelsByYear[year] || [];
      if (models.length == 0) { return; }

      console.log(`Scraping parts for ${models.length} models for year ${year}...`);
      for (const modelByYear of models) {
        const { Make: make, Model: model, ModelHref: href } = modelByYear;
        const modelId = `${year}/${make}/${model}`;
        const modelParts = partsByModel[modelId] || [];
        if (modelParts.length) { return; } // Indicates it has already been scraped. Include boolean here for optional updates
        console.log(`Scraping parts for: ${modelId} (${href})`);
        try {
          const parts = await getPartsFromModelHref(page, href);
          console.log(`Found ${parts.length} parts for ${modelId}.`);
          modelParts.push(...parts.map(
            part => ({ ...modelByYear, ...part })
          ));
          partsByModel[modelId] = modelParts;
          fs.writeFileSync(config.partsByModel, JSON.stringify(partsByModel, null, 2));
        } catch (e) {
          console.log(`Error scraping parts for: ${modelId}, message:`, e.message);
        }
      };
    };
    console.log(`Parts scraped and saved to ${config.partsByModel}`);
  });
}
scrapeParts();