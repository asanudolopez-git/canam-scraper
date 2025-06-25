import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
import withLogin from './withLogin.js';
import config from './config.js';

const scrapeParts = async () => {
  // withLogin(async page => {
  const hrefs = JSON.parse(fs.readFileSync(config.hrefsFileName, 'utf8'));
  console.log(`Loaded ${Object.keys(hrefs).length} hrefs from ${config.hrefsFileName}`);
}
scrapeParts();