const fs = require('fs');
let botJs = fs.readFileSync('bot.js', 'utf8');

// The block to replace:
const targetRegex = /function createBoard\(\) \{[\s\S]*?if \(color === 'blue'\) return \{ r: 13 - index, c: 7 \};\n\}/;

const replacement = `function renderTokenPosition(token) {
    const board = document.getElementById("ludo-board");
    if (!board || !token || !token.element) return;
    const boardRect = board.getBoundingClientRect();
    let targetEl = null;

    if (token.step === -1) {
        targetEl = document.getElementById(\`slot-\${token.color}-\${token.index}\`);
    } else if (token.step <= 51) {
        let globalIndex = (playersData[token.color].startOffset + token.step) % 52;
        let coords = masterPath[globalIndex];
        targetEl = document.getElementById(\`cell-\${coords.r}-\${coords.c}\`);
    } else {
        let homeIndex = token.step - 52;
        if (homeIndex < 5) {
            if (token.color === 'red') targetEl = document.getElementById(\`cell-7-\${homeIndex + 1}\`);
            if (token.color === 'green') targetEl = document.getElementById(\`cell-\${homeIndex + 1}-7\`);
            if (token.color === 'yellow') targetEl = document.getElementById(\`cell-7-\${13 - homeIndex}\`);
            if (token.color === 'blue') targetEl = document.getElementById(\`cell-\${13 - homeIndex}-7\`);
        } else {
            targetEl = document.getElementById(\`cell-7-7\`);
        }
    }

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const left = (rect.left - boardRect.left) + (rect.width / 2) - 10;
        const top = (rect.top - boardRect.top) + (rect.height / 2) - 10;
        token.element.style.left = \`\${left}px\`;
        token.element.style.top = \`\${top}px\`;
    }
}

function renderAllTokens() {
    ['red', 'green', 'yellow', 'blue'].forEach(col => {
        if (allTokens[col]) {
            allTokens[col].forEach(t => renderTokenPosition(t));
        }
    });
}

window.addEventListener('resize', () => {
    renderAllTokens();
});

function createBoard() {
    const board = document.getElementById("ludo-board");
    board.innerHTML = "";

    const bases = [
        { class: 'red-base', color: 'red' },
        { class: 'green-base', color: 'green' },
        { class: 'blue-base', color: 'blue' },
        { class: 'yellow-base', color: 'yellow' }
    ];

    bases.forEach(b => {
        let baseEl = document.createElement("div");
        baseEl.classList.add("base", b.class);
        
        let inner = document.createElement("div");
        inner.classList.add("inner-base");
        
        for (let i = 0; i < 4; i++) {
            let slot = document.createElement("div");
            slot.classList.add("token-slot");
            slot.id = \`slot-\${b.color}-\${i}\`;
            inner.appendChild(slot);
        }
        baseEl.appendChild(inner);
        board.appendChild(baseEl);
    });

    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8)) continue;
            
            let cell = document.createElement("div");
            cell.classList.add("ludo-cell");
            cell.id = \`cell-\${r}-\${c}\`;
            cell.style.gridArea = \`\${r + 1} / \${c + 1} / \${r + 2} / \${c + 2}\`;

            if (r === 7 && c > 0 && c < 6) cell.style.backgroundColor = "var(--red-main)";
            if (c === 7 && r > 0 && r < 6) cell.style.backgroundColor = "var(--green-main)";
            if (r === 7 && c > 8 && c < 14) cell.style.backgroundColor = "var(--yellow-main)";
            if (c === 7 && r > 8 && r < 14) cell.style.backgroundColor = "var(--blue-main)";

            if (r === 6 && c === 1) cell.style.backgroundColor = "var(--red-main)";
            if (r === 1 && c === 8) cell.style.backgroundColor = "var(--green-main)";
            if (r === 8 && c === 13) cell.style.backgroundColor = "var(--yellow-main)";
            if (r === 13 && c === 6) cell.style.backgroundColor = "var(--blue-main)";

            safeZones.forEach(z => {
                if (z.r === r && z.c === c) {
                    let star = document.createElement("span");
                    star.classList.add("safe-zone-icon");
                    star.innerText = "⭐";
                    cell.appendChild(star);
                }
            });

            board.appendChild(cell);
        }
    }
}

function spawnTokens(unlockOneToken) {
    document.querySelectorAll(".token").forEach(e => e.remove());
    ['red', 'green', 'yellow', 'blue'].forEach(color => {
        allTokens[color] = [];
        if (!activePlayers.includes(color)) return;
        
        for (let i = 0; i < 4; i++) {
            let tokenEl = document.createElement("div");
            // Important: matching the new standard token class setup
            tokenEl.classList.add("token", \`token-\${color}\`);
            tokenEl.id = \`token-\${color}-\${i}\`;
            
            tokenEl.onclick = () => {
                if (color === 'red') {
                    moveToken(color, i);
                }
            };
            
            let initialStep = -1;
            if (unlockOneToken && i === 0 && color === 'red') {
                initialStep = 0;
            }
            let tokenObj = { color, index: i, step: initialStep, element: tokenEl };
            allTokens[color].push(tokenObj);
            
            const board = document.getElementById("ludo-board");
            if (board) {
                board.appendChild(tokenEl);
            } else {
                document.body.appendChild(tokenEl);
            }
            renderTokenPosition(tokenObj);
        }
    });
}
`;

if (targetRegex.test(botJs)) {
    botJs = botJs.replace(targetRegex, replacement);
    fs.writeFileSync('bot.js', botJs);
    console.log("Successfully patched bot.js");
} else {
    console.log("Regex not matched!");
}
