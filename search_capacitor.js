const { execSync } = require('child_process');
try {
    const out = execSync('npm info @capacitor/core version').toString();
    console.log("Capacitor version:", out.trim());
} catch (e) {
    console.log("Not installed");
}
