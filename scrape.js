import dotenv from 'dotenv';
import fs from 'fs';
import config from './config/output.config.js';
import { getPartsFromVehicleHref } from './lib/navigation.js';
import { withLogin, flatten, sanitizeParts, getYearRange, getCurrentYear, readJson } from './lib/utils.js';
dotenv.config();
const CURRENT_YEAR = getCurrentYear();

export const scrapeParts = async ({ start = YEAR_1, end = CURRENT_YEAR }) => {
  const partsByVehicle = readJson(config.partsByVehicleFilename) || {};
  await withLogin(async page => {
    const years = getYearRange(start, end);

    const vehiclesByYear = readJson(config.vehiclesByYearFilename) || {}
    for (const year of years) {
      const vehicles = vehiclesByYear[year] || [];

      console.log(`Scraping parts for ${vehicles.length} vehicles for year ${year}...`);
      for (const vehicleByYear of vehicles) {
        const { ModelHref: modelHref, BodyHref: bodyHref } = vehicleByYear;
        const vehicleId = bodyHref || modelHref;
        const vehicleParts = partsByVehicle[vehicleId] || [];
        if (partsByVehicle[vehicleId]) {
          console.log(`${vehicleId} has already been scraped, skipping...`)
          continue;
        }

        try {
          console.log(`Scraping parts for: ${vehicleId}`);
          const parts = await getPartsFromVehicleHref(page, vehicleId);
          console.log(`Found ${parts.length} parts for ${vehicleId}.`);
          vehicleParts.push(...parts.map(
            part => ({ ...vehicleByYear, ...part })
          ));
          partsByVehicle[vehicleId] = vehicleParts;
          fs.writeFileSync(config.partsByVehicleFilename, JSON.stringify(partsByVehicle, null, 2));
        } catch (e) {
          console.log(`Error scraping parts for: ${vehicleId}, message:`, e.message);
        }
      };
    };
    console.log(`Parts scraped and saved to ${config.partsByVehicleFilename}`);
  });
  return partsByVehicle;
}

export const flattenPartsByVehicle = partsByVehicle => {
  const parts = flatten(Object.values(partsByVehicle), sanitizeParts);
  fs.writeFileSync(config.partsFilename, JSON.stringify(parts, null, 2));
};

const scrape = async () => {
  const partsByVehicle = await scrapeParts({ start: getCurrentYear() });
  flattenPartsByVehicle(partsByVehicle);
};
export default scrape;

scrape().catch((err) => {
  console.error('❌ Fatal insert error:', err);
  process.exit(1);
});;;