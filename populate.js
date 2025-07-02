import { getHrefsForYears } from "./lib/navigation.js";
import fs from "fs";
import config from "./config/output.config.js";
import { getCurrentYear, withLogin } from './lib/utils.js';
import { PARTS_TEMPLATE } from "./lib/constants.js";
dotenv.config();

const populateVehicleHrefs = async (existingHrefs = {}, yearRange) => {
  withLogin(async page => {
    const hrefs = await getHrefsForYears(yearRange, page, existingHrefs);
    fs.writeFileSync(config.hrefsFileName, JSON.stringify(hrefs, null, 2));
    populateVehiclesByYear(hrefs);
  });
}

const populateVehiclesByYear = hrefs => {
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
  const hrefs = JSON.parse(fs.readFileSync(config.hrefsFileName, 'utf8'));
  await populateVehicleHrefs(hrefs, { start: getCurrentYear() });
  console.log(`Hrefs populated in ${config.hrefsFileName}`);
  console.log(`Vehicle Templates populated in ${config.vehiclesByYearFilename}`);
}
populate();

export default populate;