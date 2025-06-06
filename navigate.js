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

      data.push({
        Year: year.year,
        Make: make.make,
        Model: model.model,
        PartNumber: partNumber,
        Description: description,
        WebsitePrice1_CanAm: price
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
