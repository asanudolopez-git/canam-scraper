import clean from './clean.js';
import populate from './populate.js';
import scrape from './scrape.js';
import importIdentifiers from './importIdentifiers.js';
import exportCsv from './exportCsv.js';

const main = async () => {
  await clean();
  await populate();
  await scrape();
  await importIdentifiers();
  await exportCsv();
};
main();