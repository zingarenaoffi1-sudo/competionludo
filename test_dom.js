const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('bot.html', 'utf8');
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "file://" + __dirname + "/bot.html",
});
dom.window.onerror = function(msg, source, lineno, colno, error) {
  console.log("DOM Error: ", msg, source, lineno, error);
};
dom.window.addEventListener('load', () => {
    console.log("Loaded.");
    setTimeout(() => {
        console.log("Exiting.");
        process.exit(0);
    }, 1000);
});
