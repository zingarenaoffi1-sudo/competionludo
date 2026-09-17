const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url()));

  try {
    await page.goto('http://localhost:3000/bot.html', { waitUntil: 'networkidle0' });
    console.log("Page loaded successfully.");
  } catch(e) {
    console.log("Error loading page: ", e.message);
  }
  
  await browser.close();
})();
