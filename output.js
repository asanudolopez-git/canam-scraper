import fs from 'fs';
import csv from 'csv-parser';
import { Parser } from 'json2csv';
import config from './config/output.config'
import { PARTS_TEMPLATE } from './constants';
import { flatten, sanitizeParts, constructId } from './utils';

export const flattenPartsByVehicle = () => {
  const partsByVehicle = JSON.parse(fs.readFileSync(config.partsByVehicleFilename, 'utf8')) || {};
  const parts = flatten(Object.values(partsByVehicle), sanitizeParts);
  fs.writeFileSync(config.partsByVehicleFlattenedFilename, JSON.stringify(parts, null, 2));
};

export const partsToCsv = (parts = flattenPartsByVehicle(), fileName) => {
  const parser = new Parser({
    fields: Object.keys(PARTS_TEMPLATE),
    defaultValue: '',
    quote: '"',
    delimiter: ','
  });
  const csv = parser.parse(parts);
  fs.writeFileSync(fileName, csv, 'utf8');
};

export const makeIdentifiersFromDatabaseCSV = inputPath => {
  // SELECT 
  // COALESCE("BodyHref", "ModelHref") || '--' || "PartNumber" AS constructed_id
  // FROM public.canam_parts;

  // const inputPath = './tmp/data-1751401275123.csv';  // Your CSV file
  const outputPath = config.identifiersDbFilename;
  const ids = [];

  fs.createReadStream(inputPath)
    .pipe(csv())
    .on('data', (row) => {
      if (row.constructed_id) {
        ids.push(row.constructed_id.trim());
      }
    })
    .on('end', () => {
      fs.writeFileSync(outputPath, JSON.stringify(ids, null, 2));
      console.log(`✅ Written ${ids.length} IDs to ${outputPath}`);
    });
}

export const makeIdentifiersFromPartsByVehicleFlattened = () => {
  const parts = JSON.parse(fs.readFileSync(config.partsByVehicleFlattenedFilename, 'utf8')).map(constructId);
  fs.writeFileSync(config.identifiersFilename, parts, JSON.stringify(parts, null, 2));
};

export const compareIdentifiers = () => {
  const dbIds = JSON.parse(fs.readFileSync(config.identifiersDbFilename, 'utf8'));
  const ids = JSON.parse(fs.readFileSync(config.identifiersFilename, 'utf8'));
  // 1. Count duplicates in `ids`
  const dbSet = new Set(dbIds);
  const idsSet = new Set(ids);
  const duplicates = new Set();
  for (const id of ids) {
    if (dbSet.has(id)) { duplicates.add(id) }
  }
  // 2. IDs in `ids` but not in `dbIds`
  const notInDb = ids.filter(id => !dbSet.has(id));
  // 3. dbIds not found in ids
  const notInIds = dbIds.filter(id => !idsSet.has(id));
  const notInIdsSample = [
    notInIds[Math.floor(Math.random() * notInIds.length)],
    notInIds[Math.floor(Math.random() * notInIds.length)],
    notInIds[Math.floor(Math.random() * notInIds.length)]
  ];

  // Parts that have to be updated
  console.log(`✅ IDs in DB: ${duplicates.size}`);
  // Parts that have to be created
  console.log(`✅ IDs not in DB: ${notInDb.length}`);

  // Parts without a price
  console.log(`❌ IDs in DB not found in ids: ${notInIds.length}, examples: \n`, notInIdsSample);

  const partsToUpdate = duplicates.map(part => {
    const [href, partNumber] = part.split("--");
    return { href, partNumber };
  });

  const partsToCreate = notInDb.map(part => {
    const [href, partNumber] = part.split("--");
    return { href, partNumber };
  });

  return {
    partsToUpdate,
    partsToCreate
  }
}
