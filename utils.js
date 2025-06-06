export const withRetry = async (fn, retries = 3, delay = 1000, label = '') => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed for ${label || 'task'}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
};

export const startsWithFWorDW = (str = '') => /^(FW|DW)/.test(str);

export const extractPartsFromTableRows = async (rows, year, make, model) => {
  const data = [];

  for (const row of rows) {
    try {
      // Only add rows that have a part number link
      const partNumber = await row.$eval('.partNumber a', el => el && el.innerText.trim());
      if (!startsWithFWorDW(partNumber)) { continue; };
      const description = await row.$eval('.description', el => el.innerText.trim());
      // Ignore MSRP
      const price = await row.$eval('.price', el => el.innerText.trim().split(/\s+/)[0]);

      const availability = await row.$eval('.availability', element => element.innerText.trim());
      const ships = await row.$eval('.ships', element => element.innerText.trim());
      data.push({
        Year: year.year,
        YearHref: year.href,
        Make: make.make,
        MakeHref: make.href,
        Model: model.model,
        ModelHref: model.href,
        Body: '',
        BodyHref: '',
        PartNumber: partNumber,
        Description: description,
        WebsitePrice1_CanAm: price,
        Availability: availability,
        Ships: ships,
      });
    } catch { }
  }
  if (data.length === 0) {
    console.warn(`No parts found for model: ${model.model}`);
  } else {
    console.log(`Successfully scraped ${data.length} parts for model: ${model.model}`);
  }
  return data;
};