import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

import { withRetry } from './utils.js';

dotenv.config();

const withLogin = async (fn) => {
  const browser = await puppeteer.launch({
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.goto('https://www.canamautoglass.ca/?redirect=/');
  await page.type('input[name="username"]', process.env.CANAM_USER);
  await page.type('input[name="password"]', process.env.CANAM_PASS);

  await withRetry(() =>
    Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]),
    3,
    3000,
    'Login navigation'
  );

  console.log('Login successful');
  await fn(page);
  await browser.close();
  console.log('Browser closed');
};

export default withLogin;