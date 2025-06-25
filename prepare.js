import { getHrefsForYears } from "./navigation.js";
import withLogin from "./withLogin.js";
import fs from "fs";
import config from "./config.js";
import { PARTS_TEMPLATE } from "./constants.js";

const populateHrefs = async () => {
  withLogin(async page => {
    const hrefs = await getHrefsForYears(2000, 2025, page);
    fs.writeFileSync(config.hrefsFileName, JSON.stringify(hrefs, null, 2));
    populateModelPartTemplates(hrefs);
  });
}

const populateModelPartTemplates = hrefs => {
  const parts = [];
  Object.entries(hrefs).forEach(([year, { yearHref, makes }]) => {
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
  });
  fs.writeFileSync(config.partsTemplateOutput, JSON.stringify(parts, null, 2));
  console.log(`Wrote ${parts.length} parts to ${config.partsTemplateOutput}`);
}

const prepare = async () => {
  await populateHrefs();
  console.log(`Hrefs populated in ${config.hrefsFileName}`);
  console.log(`Parts template populated in ${config.partsTemplateOutput}`);
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