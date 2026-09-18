const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');
const androidPublicDir = path.join(__dirname, 'android/app/src/main/assets/public');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

function copyToDestination(targetDir) {
    if (!fs.existsSync(targetDir)) return;
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        if (file === 'www' || file === 'android' || file === 'node_modules' || file === '.git' || file === '.github') continue;
        
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(targetDir, file);
        
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            if (file === 'assets' || file === 'sounds' || file === 'screenshots') {
                fs.cpSync(srcPath, destPath, { recursive: true });
            }
        } else {
            const ext = path.extname(file);
            if (['.html', '.css', '.js', '.png', '.json', '.jpg', '.jpeg', '.svg'].includes(ext)) {
                if (!['server.js', 'build.js', 'prepare-android.py', 'test_script.js'].includes(file) && !file.startsWith('patch_') && !file.startsWith('test_')) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
    }
}

try {
    copyToDestination(destDir);
    if (fs.existsSync(androidPublicDir)) {
        copyToDestination(androidPublicDir);
    }
    console.log("Build completed successfully. Files synced to www/ and android assets.");
} catch(e) {
    console.error("Build failed:", e);
    process.exit(1);
}
