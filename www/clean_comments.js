const fs = require('fs');
const decomment = require('decomment');
const files = fs.readdirSync('.');
files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.css')) {
        if (file === 'admob-config.js') return; 
        try {
            let code = fs.readFileSync(file, 'utf8');
            let cleaned = decomment(code);
            cleaned = cleaned.replace(/^\s*[\r\n]/gm, '');
            fs.writeFileSync(file, cleaned);
            console.log("Cleaned:", file);
        } catch (e) {
            console.log("Error cleaning:", file, e.message);
        }
    } else if (file.endsWith('.html')) {
        try {
            let html = fs.readFileSync(file, 'utf8');
            html = decomment.html(html);
            html = html.replace(/\bGOTI\b/g, 'TOKEN');
            html = html.replace(/\bGoti\b/g, 'Token');
            html = html.replace(/\bgoti\b/g, 'token');
            fs.writeFileSync(file, html);
            console.log("Cleaned HTML:", file);
        } catch(e) {
            console.log("Error cleaning:", file, e.message);
        }
    }
});
