const fs = require('fs');
let code = fs.readFileSync('bot.js', 'utf8');

const newRender = `function renderTokenPosition(token) {
    const el = token.element;
    if (token.step === -1) {
        let baseR = 0, baseC = 0;
        if (token.color === 'green') baseC = 9;
        if (token.color === 'yellow') { baseR = 9; baseC = 9; }
        if (token.color === 'blue') { baseR = 9; baseC = 0; }
        
        let spotR = baseR + 1.5;
        let spotC = baseC + 1.5;
        if (token.index === 1) spotC += 2;
        if (token.index === 2) spotR += 2;
        if (token.index === 3) { spotR += 2; spotC += 2; }
        
        el.style.top = \`calc(\${(spotR / 15) * 100}% + 3px)\`;
        el.style.left = \`calc(\${(spotC / 15) * 100}% + 3px)\`;
    } else if (token.step === 56) {
        const boardRect = document.getElementById("ludo-board").getBoundingClientRect();
        const centerOffset = 0.44 * boardRect.width;
        el.style.top = \`\${centerOffset}px\`;
        el.style.left = \`\${centerOffset}px\`;
    } else if (token.step <= 50) {
        let globalIndex = (playersData[token.color].startOffset + token.step) % 52;
        let coords = masterPath[globalIndex];
        positionTokenOnGrid(el, coords.r, coords.c);
    } else {
        let homeIndex = token.step - 51;
        let coords = getHomePathCoords(token.color, homeIndex);
        positionTokenOnGrid(el, coords.r, coords.c);
    }
}`;

code = code.replace(/function renderTokenPosition\(token\) \{[\s\S]*?(?=function positionTokenOnGrid)/, newRender + "\n\n");
fs.writeFileSync('bot.js', code);
console.log("Patched renderTokenPosition in bot.js");
