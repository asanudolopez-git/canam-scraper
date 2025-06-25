import { getHrefsForYears } from "./navigation.js";
import withLogin from "./withLogin.js";
import fs from "fs";
import config from "./config.js";
import { PARTS_TEMPLATE } from "./constants.js";

const populateHrefs = async () => {
  withLogin(async page => {
    const hrefs = await getHrefsForYears(2000, 2025, page);
    fs.writeFileSync(config.hrefsFileName, JSON.stringify(hrefs, null, 2));
    populateModelsByYear(hrefs);
  });
}

const populateModelsByYear = hrefs => {
  const modelsByYear = {};
  Object.entries(hrefs).forEach(([year, { yearHref, makes }]) => {
    const parts = [];
    Object.entries(makes).forEach(([make, { href: makeHref, models }]) => {
      Object.entries(models).forEach(([model, { href: modelHref }]) => {
        const part = { ...PARTS_TEMPLATE };
        part.Year = year;
        part.YearHref = yearHref;
        part.Make = make;
        part.MakeHref = makeHref;
        part.Model = model;
        part.ModelHref = modelHref;
        parts.push(part);
      });
    });
    modelsByYear[year] = parts;
  });
  fs.writeFileSync(config.modelsByYear, JSON.stringify(modelsByYear, null, 2));
}

const prepare = async () => {
  await populateHrefs();
  console.log(`Hrefs populated in ${config.hrefsFileName}`);
  console.log(`Models template populated in ${config.modelsByYear}`);
}
prepare()
  .catch(err => {
    console.error('Error in prepare:', err);
    process.exit(1);
  })
  .finally(() => {
    console.log('Preparation complete.');
  }
  );  