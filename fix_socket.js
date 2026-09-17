const fs = require('fs');

function fixFile(file) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    
    // Fix socket URL
    code = code.replace(
        /const socketUrl = \(window\.location\.protocol\.startsWith\('http'\) && !window\.location\.href\.includes\('capacitor'\)\)\s*\?\s*window\.location\.origin\s*:\s*'https:\/\/competionludo\.onrender\.com';/g,
        "const socketUrl = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? 'https://competionludo.onrender.com' : window.location.origin;"
    );

    // Fix Capacitor Auth checks
    code = code.replace(/if \(false\)/g, "if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication)");

    fs.writeFileSync(file, code);
}

fixFile('script.js');
fixFile('competition.js');
fixFile('bot.js'); // just in case
fixFile('local.js'); // just in case

console.log("Fixed files.");
