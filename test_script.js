const fs = require('fs');
const content = fs.readFileSync('competition.js', 'utf8');
const replaced = content.replace(/if \(window\.Capacitor && window\.Capacitor\.Plugins && window\.Capacitor\.Plugins\.FirebaseAuthentication\)/g, "if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication)");
fs.writeFileSync('competition.js', replaced);
