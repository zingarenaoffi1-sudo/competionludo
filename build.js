const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
}

function copyFiles() {
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        if (file === 'www' || file === 'node_modules' || file === '.git' || file === '.github') continue;
        
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            if (file === 'assets' || file === 'sounds') {
                fs.cpSync(srcPath, destPath, { recursive: true });
            }
        } else {
            const ext = path.extname(file);
            if (['.html', '.css', '.js', '.png', '.json', '.jpg', '.jpeg', '.svg'].includes(ext)) {
                if (!['server.js', 'build.js', 'prepare-android.py', 'test_script.js'].includes(file) && !file.startsWith('patch_')) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
    }
}

try {
    copyFiles();
    console.log("Build completed successfully. Files copied to www/.");
} catch(e) {
    console.error("Build failed:", e);
    process.exit(1);
}
