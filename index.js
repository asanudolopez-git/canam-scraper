import dotenv from 'dotenv';
import fs from 'fs';
import { Parser } from 'json2csv';
import withLogin from './withLogin.js';
import config from './config/output.config.js';
import { PARTS_TEMPLATE } from './constants.js'
import { getPartsFromVehicleHref } from './navigation.js';
import { getYearRange, flatten, sanitizeParts } from './utils.js';
dotenv.config();

export const scrapeParts = async () => {
  withLogin(async page => {
    const years = getYearRange(2000, 2025); // For testing, you can set this to a specific year or range

    const vehiclesByYear = JSON.parse(fs.readFileSync(config.vehiclesByYearFilename, 'utf8'));
    const partsByVehicle = JSON.parse(fs.readFileSync(config.partsByVehicleFilename, 'utf8')) || {};
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
}
export const partsToCsv = () => {
  let parts = JSON.parse(fs.readFileSync(config.partsByVehicleFlattenedFilename, 'utf8'));
  if (!parts.length) {
    const partsByVehicle = JSON.parse(fs.readFileSync(config.partsByVehicleFilename, 'utf8'));
    parts = flatten(Object.values(partsByVehicle), sanitizeParts);
    fs.writeFileSync(config.partsByVehicleFlattenedFilename, JSON.stringify(parts, null, 2));
  }
  console.log(`Found ${parts.length} parts`);

  const parser = new Parser({
    fields: Object.keys(PARTS_TEMPLATE),
    defaultValue: '',
    quote: '"',
    delimiter: ','
  });
  const csv = parser.parse(parts);
  fs.writeFileSync(config.CanAmPartsFilename, csv, 'utf8');
};

partsToCsv();