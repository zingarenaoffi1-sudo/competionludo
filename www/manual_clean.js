const fs = require('fs');
const files = fs.readdirSync('.');
files.forEach(file => {
    if (file === 'manual_clean.js' || file === 'clean_comments.js' || file === 'admob-config.js') return;
    if (file === 'server.js') return; 
    if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/\bGOTI\b/g, 'TOKEN');
        content = content.replace(/\bGoti\b/g, 'Token');
        content = content.replace(/\bgoti\b/g, 'token');
        if (file.endsWith('.html')) {
            content = content.replace(/<!--[\s\S]*?-->/g, '');
        }
        if (file.endsWith('.css')) {
            content = content.replace(/\/\*[\s\S]*?\*\//g, '');
        }
        if (file.endsWith('.js')) {
            content = content.replace(/\/\*[\s\S]*?\*\//g, '');
            content = content.split('\n').map(line => {
                if (line.trim().startsWith('//')) {
                    return ''; 
                }
                let idx = line.indexOf('//');
                if (idx !== -1) {
                    if (idx > 0 && line[idx-1] === ':') {
                        return line;
                    }
                    return line.substring(0, idx);
                }
                return line;
            }).join('\n');
        }
        content = content.replace(/^\s*[\r\n]/gm, '');
        fs.writeFileSync(file, content, 'utf8');
        console.log("Cleaned:", file);
    }
});
