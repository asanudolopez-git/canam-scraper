import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

import withLogin from './withLogin.js';
import { getHrefsForYears } from './navigation.js';

const populateHrefs = async () => {
  withLogin(async page => {
    const hrefs = await getHrefsForYears(2000, 2025, page);
    fs.writeFileSync('hrefs.json', JSON.stringify(hrefs, null, 2));
  });
}

const scrapeParts = async () => { }