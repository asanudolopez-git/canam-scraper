export const getYear = () => {
  const year = String(new Date().getFullYear());
  return { year, href: `https://www.canamautoglass.ca/nags/${year}/` };
};

export const getMakes = async (page) => {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'), el => ({
      make: el.innerText.trim(),
      href: el.href
    }))
  );
};

export const getModels = async (page) => {
  return await page.evaluate(() =>
    Array.from(document.querySelectorAll('.list-group-item.nagsPill'), el => ({
      model: el.innerText.trim(),
      href: el.href
    }))
  );
};

export const getPartsFromModel = async (page, year, make, model) => {
  const rows = await page.$$('.vehicleTable tbody tr');
  console.log(`Found ${rows.length} parts for model: ${model.model}`);
  const data = [];

  for (const row of rows) {
    try {
      // Only add rows that have a part number link
      const partNumber = await row.$eval('.partNumber a', el => el && el.innerText.trim());
      if (!Boolean(partNumber)) { continue; };
      const description = await row.$eval('.description', el => el.innerText.trim());
      // Ignore MSRP
      const price = await row.$eval('.price', el => el.innerText.trim().split(/\s+/)[0]);

      const availability = await row.$eval('.availability', element => element.innerText.trim());
      const ships = await row.$eval('.ships', element => element.innerText.trim());
      console.log(`Processing part: ${partNumber} - ${description}`, {
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
