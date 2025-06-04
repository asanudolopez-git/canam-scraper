export const getYears = async () => {
  const currentYear = String(new Date().getFullYear());

  return [{ year: currentYear, href: `https://www.canamautoglass.ca/nags/${currentYear}/` }];
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
  const data = [];

  for (const row of rows) {
    try {
      const partNumber = await row.$eval('.partNumber', el => el.innerText.trim());
      const description = await row.$eval('.description', el => el.innerText.trim());
      const price = await row.$eval('.price', el => el.innerText.trim());

      data.push({
        Year: year.year,
        Make: make.make,
        Model: model.model,
        PartNumber: partNumber,
        Description: description,
        WebsitePrice1_CanAm: price
      });
    } catch {}
  }

  return data;
};
