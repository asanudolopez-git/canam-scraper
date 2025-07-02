import fs from 'fs';
import config from './config/output.config.js'
import { partsToCsv, readCsv, constructId } from './utils.js';

export const generateOutputSets = async productionCsvFilename => {
  const localSet = new Set(
    JSON.parse(
      fs.readFileSync(config.partsFilename, 'utf8')
    ).map(constructId)
  )

  const productionSet = new Set();
  await readCsv(productionCsvFilename, row =>
    row.constructed_id && productionSet.add(row.constructed_id.trim())
  )

  console.log(`✅ ${productionSet.size} ids in production`);
  console.log(`✅ ${localSet.size} ids locally`);

  const partsToUpdate = [];
  const partsToCreate = [];
  const partsOrphaned = Array.from(productionSet).filter(id => localSet.has(id));

  localSet.forEach(id => {
    const [href, partNumber] = id.split('--');
    if (productionSet.has(id)) {
      partsToUpdate.push({ href, partNumber })
    } else {
      partsToCreate.push({ href, partNumber })
    }
  })

  console.log(`✅ ${partsToUpdate.length} Parts to be updated!`);
  console.log(`✅ ${partsToCreate.length} Parts to create!`);
  console.log(`🤔 ${partsOrphaned.length} Parts that exist in the Database but were not scraped!`);
  console.log(`🤞CHECKSUM🤞: ${partsToUpdate.length + partsOrphaned.length} === ${productionSet.size}`)
  return {
    partsToUpdate,
    partsToCreate,
  };
}

export const generateCsv = async () => {
  const productionCsvFilename = process.argv[2];
  let { partsToUpdate, partsToCreate } = await generateOutputSets(productionCsvFilename);
  const partsByVehicle = JSON.parse(fs.readFileSync(config.partsByVehicleFilename, 'utf8'));

  partsToUpdate = partsToUpdate.map(({ href, partNumber }) =>
    partsByVehicle[href].find(
      ({ PartNumber }) => PartNumber === partNumber
    )
  );

  partsToCreate = partsToCreate.map(({ href, partNumber }) =>
    partsByVehicle[href].find(
      ({ PartNumber }) => PartNumber === partNumber
    )
  );
  partsToCsv(partsToUpdate, config.partsToUpdateFilename);
  partsToCsv(partsToCreate, config.partsToCreateFilename);
}

generateCsv();