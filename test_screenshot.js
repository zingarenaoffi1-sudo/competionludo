const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/bot.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'bot_screenshot.png' });
  console.log("Screenshot saved.");
  
  await browser.close();
})();
