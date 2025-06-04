const config = {
  outputFile: 'CanAm_Pricing.xlsx',
  columns: [
    { header: 'Year', key: 'Year', width: 15 },
    { header: 'Make', key: 'Make', width: 20 },
    { header: 'Model', key: 'Model', width: 20 },
    { header: 'PartNumber', key: 'PartNumber', width: 25 },
    { header: 'Description', key: 'Description', width: 30 },
    { header: 'WebsitePrice1_CanAm', key: 'WebsitePrice1_CanAm', width: 20 }
  ]
};

export default config;
