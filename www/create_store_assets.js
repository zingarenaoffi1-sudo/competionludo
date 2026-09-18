const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  console.log("Generating 114x114 icon...");
  execSync('convert icon.png -resize 114x114 icon_114.png');
  execSync('convert icon.png -resize 114x114 www/icon_114.png');

  console.log("Generating 1024x500 Promotional Banner...");
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

  // 1. Create Promotional Banner HTML & screenshot
  const promoPage = await browser.newPage();
  await promoPage.setViewport({ width: 1024, height: 500 });
  const promoHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        width: 1024px;
        height: 500px;
        background: radial-gradient(circle at center, #1e3a8a 0%, #0f172a 100%);
        display: flex;
        align-items: center;
        justify-content: space-around;
        font-family: sans-serif;
        color: white;
        overflow: hidden;
      }
      .left {
        text-align: left;
        padding-left: 60px;
      }
      h1 {
        font-size: 56px;
        margin: 0 0 12px 0;
        color: #fbbf24;
        text-shadow: 0 4px 15px rgba(0,0,0,0.6);
        letter-spacing: 2px;
      }
      p {
        font-size: 24px;
        color: #93c5fd;
        margin: 0 0 24px 0;
      }
      .tags {
        display: flex;
        gap: 12px;
      }
      .tag {
        background: rgba(255,255,255,0.15);
        border: 1px solid #38bdf8;
        border-radius: 20px;
        padding: 8px 18px;
        font-size: 16px;
        font-weight: bold;
        color: #f8fafc;
      }
      .right img {
        width: 320px;
        height: 320px;
        border-radius: 40px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.8);
        border: 4px solid #38bdf8;
        margin-right: 60px;
      }
    </style>
  </head>
  <body>
    <div class="left">
      <h1>LUDO ZING ARENA</h1>
      <p>Classic Board Game & Tournaments</p>
      <div class="tags">
        <div class="tag">Offline Bots</div>
        <div class="tag">Pass & Play</div>
        <div class="tag">100% Free</div>
      </div>
    </div>
    <div class="right">
      <img src="http://localhost:3000/icon.png" alt="Icon">
    </div>
  </body>
  </html>
  `;
  await promoPage.setContent(promoHtml);
  await new Promise(r => setTimeout(r, 1000));
  await promoPage.screenshot({ path: 'promo_1024x500.png' });
  await promoPage.screenshot({ path: 'www/promo_1024x500.png' });
  await promoPage.close();

  // 2. Generate crisp screenshots for 1280x800 (landscape) and 800x1280 (portrait)
  // Let's create beautiful rich game screenshots
  const shots = [
    { url: 'http://localhost:3000/index.html', name: 'shot1_menu' },
    { url: 'http://localhost:3000/bot.html', name: 'shot2_bot' },
    { url: 'http://localhost:3000/local.html', name: 'shot3_local' },
    { url: 'http://localhost:3000/competition.html', name: 'shot4_tournament' }
  ];

  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    // Portrait: 800x1280
    const pPort = await browser.newPage();
    await pPort.setViewport({ width: 800, height: 1280 });
    await pPort.goto(s.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await pPort.screenshot({ path: `screenshots/${s.name}_800x1280.png` });
    await pPort.screenshot({ path: `www/screenshots/${s.name}_800x1280.png` });
    await pPort.close();

    // Landscape: 1280x800
    const pLand = await browser.newPage();
    await pLand.setViewport({ width: 1280, height: 800 });
    await pLand.goto(s.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await pLand.screenshot({ path: `screenshots/${s.name}_1280x800.png` });
    await pLand.screenshot({ path: `www/screenshots/${s.name}_1280x800.png` });
    await pLand.close();

    // Landscape 800x480
    const pSmall = await browser.newPage();
    await pSmall.setViewport({ width: 800, height: 480 });
    await pSmall.goto(s.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await pSmall.screenshot({ path: `screenshots/${s.name}_800x480.png` });
    await pSmall.screenshot({ path: `www/screenshots/${s.name}_800x480.png` });
    await pSmall.close();
  }

  await browser.close();
  console.log("All store assets generated successfully!");
})();
