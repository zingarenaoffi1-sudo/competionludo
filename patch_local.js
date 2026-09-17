const fs = require("fs");
let code = fs.readFileSync("local.js", "utf8");

// 1. Rewrite rollDice to use 3D transform instead of flat CSS animation
const rollDiceRegex = /function rollDice\(\) \{[\s\S]*?checkAvailableMoves\(\);\n    \}, 600\);\n\}/;
const newRollDice = `function rollDice() {
    if (gameState !== 'WAITING_FOR_ROLL' || isMoving) return;
    gameState = 'ROLLING';
    let currentColor = activePlayers[currentPlayerIndex];
    let diceEl = document.getElementById(\`dice-\${currentColor}\`);
    
    // Inject 3D cube if not present
    if (!diceEl.innerHTML.includes('dice-cube')) {
        diceEl.innerHTML = '<div class="dice-cube-container"><div class="dice-cube"><div class="dice-face front"></div><div class="dice-face back"></div><div class="dice-face right"></div><div class="dice-face left"></div><div class="dice-face top"></div><div class="dice-face bottom"></div></div></div>';
        diceEl.style.background = 'transparent';
        diceEl.style.border = 'none';
        diceEl.style.boxShadow = 'none';
    }
    
    let cube = diceEl.querySelector('.dice-cube');
    let faces = cube.querySelectorAll('.dice-face');
    
    // Random spins
    let rx = (Math.floor(Math.random() * 4) + 1) * 360;
    let ry = (Math.floor(Math.random() * 4) + 1) * 360;
    cube.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    cube.style.transform = \`rotateX(\${rx}deg) rotateY(\${ry}deg)\`;
    
    soundDice.currentTime = 0;
    soundDice.play().catch(e => {});
    
    setTimeout(() => {
        currentDiceValue = Math.floor(Math.random() * 6) + 1;
        // Snap to front face to show result cleanly
        cube.style.transition = 'none';
        cube.style.transform = 'rotateX(0deg) rotateY(0deg)';
        faces[0].innerText = diceFaces[currentDiceValue];
        faces[0].style.color = currentDiceValue === 6 ? "#ff3333" : "#111";
        
        gameState = 'WAITING_FOR_MOVE';
        checkAvailableMoves();
    }, 650);
}`;
code = code.replace(rollDiceRegex, newRollDice);

// 2. Rewrite moveToken to hop step-by-step
const moveTokenRegex = /function moveToken\(color, tokenIndex\) \{[\s\S]*?function checkCapture\(token\) \{/m;
const newMoveToken = `function moveToken(color, tokenIndex) {
    if (gameState !== 'WAITING_FOR_MOVE' || isMoving) return;
    let currentColor = activePlayers[currentPlayerIndex];
    if (color !== currentColor) return;
    allTokens[color].forEach(t => t.element.classList.remove("highlight-move"));
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
        switchTurn(true);
        return;
    }
    
    let startStep = token.step;
    let targetStep = token.step + currentDiceValue;
    
    function doHop(currentStep) {
        if (currentStep > targetStep) {
            isMoving = false;
            let extraTurn = (currentDiceValue === 6 || targetStep === 56);
            let cutEnemy = checkCapture(token);
            if (cutEnemy) extraTurn = true;
            if (checkPlayerWon(color)) {
                handlePlayerWin(color);
                return;
            }
            switchTurn(extraTurn);
            return;
        }
        
        token.step = currentStep;
        renderTokenPosition(token);
        
        // Add hop animation
        token.element.classList.remove("hopping");
        void token.element.offsetWidth; // trigger reflow
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
fs.writeFileSync("local.js", code);
