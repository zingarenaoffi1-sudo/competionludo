const fs = require("fs");
let code = fs.readFileSync("online.html", "utf8");
const rollDiceRegex = /function rollDice\(\) \{[\s\S]*?socket\.emit\('rollDice', \{ roomId, color: myColor, value: val \}\);\n    \}, 600\);\n\}/;
const newRollDice = `function rollDice() {
    if (gameState !== 'WAITING_FOR_ROLL' || activePlayers[currentPlayerIndex] !== myColor || isMoving) return;
    soundDice.currentTime = 0;
    soundDice.play().catch(e => {});
    let diceEl = document.getElementById(\`dice-\${myColor}\`);
    if (!diceEl.innerHTML.includes('dice-cube')) {
        diceEl.innerHTML = '<div class="dice-cube-container"><div class="dice-cube"><div class="dice-face front"></div><div class="dice-face back"></div><div class="dice-face right"></div><div class="dice-face left"></div><div class="dice-face top"></div><div class="dice-face bottom"></div></div></div>';
        diceEl.style.background = 'transparent';
        diceEl.style.border = 'none';
        diceEl.style.boxShadow = 'none';
    }
    let cube = diceEl.querySelector('.dice-cube');
    let rx = (Math.floor(Math.random() * 4) + 1) * 360;
    let ry = (Math.floor(Math.random() * 4) + 1) * 360;
    cube.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    cube.style.transform = \`rotateX(\${rx}deg) rotateY(\${ry}deg)\`;
    setTimeout(() => {
        let val = Math.floor(Math.random() * 6) + 1;
        socket.emit('rollDice', { roomId, color: myColor, value: val });
    }, 650);
}`;
code = code.replace(rollDiceRegex, newRollDice);
const moveTokenRegex = /function moveToken\(color, tokenIndex\) \{[\s\S]*?function checkCapture\(token\) \{/m;
const newMoveToken = `function moveToken(color, tokenIndex) {
    let token = allTokens[color][tokenIndex];
    if (token.step === -1 && currentDiceValue !== 6) return;
    if (token.step !== -1 && token.step + currentDiceValue > 56) return;
    isMoving = true;
    if (token.step === -1 && currentDiceValue === 6) {
        token.step = 0;
        soundMove.currentTime = 0;
        soundMove.play().catch(e => {});
        renderTokenPosition(token);
        isMoving = false;
        if (color === myColor) {
            socket.emit('moveToken', { roomId, color, tokenIndex, newStep: 0, cutEnemy: false, won: false });
        }
        return;
    }
    let startStep = token.step;
    let targetStep = token.step + currentDiceValue;
    function doHop(currentStep) {
        if (currentStep > targetStep) {
            isMoving = false;
            if (color === myColor) {
                let cutEnemy = checkCapture(token);
                let won = checkPlayerWon(color);
                socket.emit('moveToken', { roomId, color, tokenIndex, newStep: token.step, cutEnemy, won });
            } else {
                checkCapture(token);
            }
            return;
        }
        token.step = currentStep;
        renderTokenPosition(token);
        token.element.classList.remove("hopping");
        void token.element.offsetWidth;
        token.element.classList.add("hopping");
        soundMove.currentTime = 0;
        soundMove.play().catch(e => {});
        setTimeout(() => {
            token.element.classList.remove("hopping");
            doHop(currentStep + 1);
        }, 200);
    }
    doHop(startStep + 1);
}
function checkCapture(token) {`;
code = code.replace(moveTokenRegex, newMoveToken);
const socketRollRegex = /socket\.on\('diceRolled', \(data\) => \{[\s\S]*?checkAvailableMoves\(\);\n            \}, 600\);\n        \}\n    \}\);/;
const newSocketRoll = `socket.on('diceRolled', (data) => {
        currentDiceValue = data.value;
        let pColor = data.color;
        let diceEl = document.getElementById(\`dice-\${pColor}\`);
        if (!diceEl.innerHTML.includes('dice-cube')) {
            diceEl.innerHTML = '<div class="dice-cube-container"><div class="dice-cube"><div class="dice-face front"></div><div class="dice-face back"></div><div class="dice-face right"></div><div class="dice-face left"></div><div class="dice-face top"></div><div class="dice-face bottom"></div></div></div>';
            diceEl.style.background = 'transparent';
            diceEl.style.border = 'none';
            diceEl.style.boxShadow = 'none';
        }
        let cube = diceEl.querySelector('.dice-cube');
        let faces = cube.querySelectorAll('.dice-face');
        if (pColor !== myColor) {
            let rx = (Math.floor(Math.random() * 4) + 1) * 360;
            let ry = (Math.floor(Math.random() * 4) + 1) * 360;
            cube.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            cube.style.transform = \`rotateX(\${rx}deg) rotateY(\${ry}deg)\`;
            soundDice.currentTime = 0;
            soundDice.play().catch(e=>{});
        }
        setTimeout(() => {
            cube.style.transition = 'none';
            cube.style.transform = 'rotateX(0deg) rotateY(0deg)';
            faces[0].innerText = diceFaces[currentDiceValue];
            faces[0].style.color = currentDiceValue === 6 ? "#ff3333" : "#111";
            if (pColor === myColor) {
                gameState = 'WAITING_FOR_MOVE';
                checkAvailableMoves();
            }
        }, pColor === myColor ? 0 : 650);
    });`;
code = code.replace(socketRollRegex, newSocketRoll);
fs.writeFileSync("online.html", code);
