const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const screenshotsDir = './screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Configurations for both 800x480 (landscape) and 800x1280 / 480x800 (portrait)
  // Let's create:
  // 1. 800x1280 (Tablet Portrait - standard Amazon Fire Tablet)
  // 2. 800x480 (Landscape)
  // 3. 480x800 (Phone Portrait)
  // 4. 1280x800 (Tablet Landscape)

  const pages = [
    { url: 'http://localhost:3000/index.html', name: 'home' },
    { url: 'http://localhost:3000/bot.html', name: 'bot_game' },
    { url: 'http://localhost:3000/local.html', name: 'local_game' },
    { url: 'http://localhost:3000/competition.html', name: 'competition' }
  ];

  // Amazon accepts 800 x 1280 (portrait), 1280 x 800 (landscape), 480 x 800 (portrait), 800 x 480 (landscape)
  // Let's take 800 x 1280 (standard Fire Tablet portrait, pristine quality)
  // and 480 x 800 (standard mobile portrait)
  // and 800 x 480 (landscape)

  console.log("Starting screenshot capture...");

  for (let i = 0; i < pages.length; i++) {
    const pInfo = pages[i];
    
    // 1. Capture 800 x 1280 (Fire Tablet Portrait)
    const pageTablet = await browser.newPage();
    await pageTablet.setViewport({ width: 800, height: 1280, deviceScaleFactor: 1 });
    await pageTablet.goto(pInfo.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await pageTablet.screenshot({ path: `${screenshotsDir}/screenshot_${i + 1}_800x1280.png` });
    await pageTablet.close();

    // 2. Capture 800 x 480 (Amazon standard Landscape)
    const pageLandscape = await browser.newPage();
    await pageLandscape.setViewport({ width: 800, height: 480, deviceScaleFactor: 1 });
    await pageLandscape.goto(pInfo.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await pageLandscape.screenshot({ path: `${screenshotsDir}/screenshot_${i + 1}_800x480.png` });
    await pageLandscape.close();

    // 3. Capture 480 x 800 (Amazon standard Portrait)
    const pagePortrait = await browser.newPage();
    await pagePortrait.setViewport({ width: 480, height: 800, deviceScaleFactor: 1 });
    await pagePortrait.goto(pInfo.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await pagePortrait.screenshot({ path: `${screenshotsDir}/screenshot_${i + 1}_480x800.png` });
    await pagePortrait.close();

    // Also copy to root so user can access via direct URL:
    fs.copyFileSync(`${screenshotsDir}/screenshot_${i + 1}_800x1280.png`, `./screenshot_${i + 1}.png`);
  }

  console.log("All screenshots captured successfully!");
  await browser.close();
})();
