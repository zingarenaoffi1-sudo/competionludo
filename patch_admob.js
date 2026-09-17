const fs = require('fs');
let code = fs.readFileSync('admob-config.js', 'utf8');

// Replace _zingBannerInitialized logic
code = code.replace(
    /if \(!_zingBannerInitialized\) \{([\s\S]*?_zingBannerInitialized = true;\s*)\}/,
    `if (!sessionStorage.getItem('_zingAdMobInit')) {
                    await AdMob.initialize({ initializeForTesting: isTesting });
                    sessionStorage.setItem('_zingAdMobInit', 'true');
                }`
);

fs.writeFileSync('admob-config.js', code);
console.log("Patched admob-config.js");
