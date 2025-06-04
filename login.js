const login = async (page) => {
  await page.goto('https://www.canamautoglass.ca/?redirect=/');
  await page.type('input[name="username"]', process.env.CANAM_USER);
  await page.type('input[name="password"]', process.env.CANAM_PASS);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 10000 });
};

export default login;
