import { getHrefsForYears } from "./navigation.js";
import withLogin from "./withLogin.js";
import fs from "fs";
import config from "./config.js";
import { PARTS_TEMPLATE } from "./constants.js";

const populateVehicleHrefs = async (existingHrefs = {}) => {
  withLogin(async page => {
    const hrefs = await getHrefsForYears(2000, 2025, page, existingHrefs);
    fs.writeFileSync(config.hrefsFileName, JSON.stringify(hrefs, null, 2));
  });
}

const populateVehiclesByYear = hrefs => {
  const vehiclesByYear = {};
  Object.entries(hrefs).forEach(([year, { yearHref, makes }]) => {
    const parts = [];
    Object.entries(makes).forEach(([make, { href: makeHref, models }]) => {
      Object.entries(models).forEach(([model, { href: modelHref, bodyStyles }]) => {
        if (Object.keys(bodyStyles).length) {
          Object.entries(bodyStyles).forEach(([bodyStyle, { href: bodyStyleHref }]) => {
            const part = { ...PARTS_TEMPLATE };
            part.Year = year;
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
          part.Year = year;
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

const prepare = async () => {
  const hrefs = JSON.parse(fs.readFileSync(config.hrefsFileName, 'utf8'));
  await populateVehicleHrefs(hrefs);
  console.log(` populated in ${config.hrefsFileName}`);
  console.log(`Vehicle Templates populated in ${config.vehiclesByYearFilename}`);
}
prepare()
  .catch(err => {
    console.error('Error in prepare:', err);
    process.exit(1);
  })