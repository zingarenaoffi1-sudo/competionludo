const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    await page.goto('http://localhost:3000/bot.html', { waitUntil: 'networkidle0' });
    const boardHtml = await page.evaluate(() => document.getElementById('ludo-board') ? document.getElementById('ludo-board').innerHTML.length : -1);
    console.log("Board HTML length:", boardHtml);
  } catch(e) {
    console.log("Error loading page: ", e.message);
  }
  
  await browser.close();
})();
