import fs from "fs";
import dotenv from 'dotenv';
import { getHrefsForYears } from "./lib/navigation.js";
import config from "./config/output.config.js";
import { getCurrentYear, withLogin, toInt, readJson } from './lib/utils.js';
import { PARTS_TEMPLATE } from "./lib/constants.js";
dotenv.config();

export const populateVehicleHrefs = async (existingHrefs = {}, yearRange) => {
  withLogin(async page => {
    const hrefs = await getHrefsForYears(yearRange, page, existingHrefs);
    fs.writeFileSync(config.hrefsFileName, JSON.stringify(hrefs, null, 2));
    populateVehiclesByYear(hrefs);
  });
}

export const populateVehiclesByYear = hrefs => {
  const vehiclesByYear = {};
  Object.entries(hrefs).forEach(([year, { href: yearHref, makes }]) => {
    const parts = [];
    Object.entries(makes).forEach(([make, { href: makeHref, models }]) => {
      Object.entries(models).forEach(([model, { href: modelHref, bodyStyles }]) => {
        if (Object.keys(bodyStyles).length) {
          Object.entries(bodyStyles).forEach(([bodyStyle, { href: bodyStyleHref }]) => {
            const part = { ...PARTS_TEMPLATE };
            part.Year = parseInt(year);
            part.YearHref = yearHref;
            part.Make = make;
            part.MakeHref = makeHref;
            part.Model = model;
            part.ModelHref = modelHref;
            part.Body = bodyStyle;
            part.BodyHref = bodyStyleHref;
            parts.push(part);
          });
        } else {
          const part = { ...PARTS_TEMPLATE };
          part.Year = parseInt(year);
          part.YearHref = yearHref;
          part.Make = make;
          part.MakeHref = makeHref;
          part.Model = model;
          part.ModelHref = modelHref;
          parts.push(part);
        }
      });
    });
    vehiclesByYear[year] = parts;
  });
  fs.writeFileSync(config.vehiclesByYearFilename, JSON.stringify(vehiclesByYear, null, 2));
}

const populate = async () => {
  const start = toInt(process.argsv[2] || getCurrentYear());
  const hrefs = readJson(config.hrefsFileName) || {};
  await populateVehicleHrefs(hrefs, { start });
  console.log(`Hrefs populated in ${config.hrefsFileName}`);
  console.log(`Vehicle Templates populated in ${config.vehiclesByYearFilename}`);
}
export default populate;

populate().catch((err) => {
  console.error('❌ Fatal insert error:', err);
  process.exit(1);
});
