import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
import withLogin from './withLogin.js';
import config from './config.js';
import { getPartsFromVehicleHref } from './navigation.js';

const scrapeParts = async () => {
  withLogin(async page => {
    const years = [2025]; // For testing, you can set this to a specific year or range

    const vehiclesByYear = JSON.parse(fs.readFileSync(config.vehiclesByYearFilename, 'utf8'));
    const partsByVehicle = JSON.parse(fs.readFileSync(config.partsByVehicleFilename, 'utf8')) || {};
    for (const year of years) {
      const vehicles = vehiclesByYear[year] || [];
      if (vehicles.length == 0) { return; }

      console.log(`Scraping parts for ${vehicles.length} vehicles for year ${year}...`);
      for (const vehicleByYear of vehicles) {
        const { ModelHref: modelHref, BodyHref: bodyHref } = vehicleByYear;
        const vehicleId = bodyHref || modelHref;
        const vehicleParts = partsByVehicle[vehicleId] || [];
        // Tmp: Indicates it has already been scraped. Include boolean here for optional updates
        if (partsByVehicle[vehicleId]) {
          console.log(`${vehicleParts} has already been scraped, skipping...`)
          continue;
        }

        try {
          console.log(`Scraping parts for: ${vehicleParts}`);
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
scrapeParts();