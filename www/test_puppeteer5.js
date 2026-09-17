const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Intercept and block style.css
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().endsWith('style.css')) request.abort();
    else request.continue();
  });
  
  await page.goto('http://localhost:3000/bot.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'bot_no_css.png' });
  console.log("Saved bot_no_css.png");
  await browser.close();
})();
