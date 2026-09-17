const fs = require('fs');
let code = fs.readFileSync('competition.js', 'utf8');

code = code.replace(/if \(window\.Capacitor && window\.Capacitor\.isNativePlatform && window\.Capacitor\.isNativePlatform\(\) && window\.Capacitor\.Plugins && window\.Capacitor\.Plugins\.FirebaseAuthentication\)/g, "if (false)");

fs.writeFileSync('competition.js', code);
console.log("Patched Capacitor checks");
