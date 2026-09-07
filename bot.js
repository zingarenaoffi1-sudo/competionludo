// =============================================================================
// ZINGARENA LUDO - SMART AI BOT ENGINE (OFFLINE VS COMPUTER)
// =============================================================================

let activePlayers = [];
let currentPlayerIndex = 0;
let gameState = 'WAITING_FOR_ROLL';
let currentDiceValue = 0;
let isMoving = false;
const allTokens = {};

let winnersList = [];
let totalPlayersInGame = 0;
let botGameMode = 'classic'; // 'classic' or 'quick'
let botCount = 3; // 1, 2, or 3 bots
let botColors = [];

const soundDice = new Audio('sounds/board game dice_2.mp3');
const soundMove = new Audio('sounds/ui pop_2.mp3');
const soundCut = new Audio('sounds/cartoon bonk.mp3');
const soundWin = new Audio('sounds/success chime_2.mp3');

const playersData = {
    'red': { name: "You", label: "Player 1", class: "red-text", startOffset: 0 },
    'green': { name: "AI Bot 1", label: "Player 2", class: "green-text", startOffset: 13 },
    'yellow': { name: "AI Bot 2", label: "Player 3", class: "yellow-text", startOffset: 26 },
    'blue': { name: "AI Bot 3", label: "Player 4", class: "blue-text", startOffset: 39 }
};

const masterPath = [
    {r:6, c:1}, {r:6, c:2}, {r:6, c:3}, {r:6, c:4}, {r:6, c:5}, 
    {r:5, c:6}, {r:4, c:6}, {r:3, c:6}, {r:2, c:6}, {r:1, c:6}, {r:0, c:6}, {r:0, c:7}, {r:0, c:8}, 
    {r:1, c:8}, {r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8}, 
    {r:6, c:9}, {r:6, c:10}, {r:6, c:11}, {r:6, c:12}, {r:6, c:13}, {r:6, c:14}, {r:7, c:14}, {r:8, c:14}, 
    {r:8, c:13}, {r:8, c:12}, {r:8, c:11}, {r:8, c:10}, {r:8, c:9}, 
    {r:9, c:8}, {r:10, c:8}, {r:11, c:8}, {r:12, c:8}, {r:13, c:8}, {r:14, c:8}, {r:14, c:7}, {r:14, c:6}, 
    {r:13, c:6}, {r:12, c:6}, {r:11, c:6}, {r:10, c:6}, {r:9, c:6}, 
    {r:8, c:5}, {r:8, c:4}, {r:8, c:3}, {r:8, c:2}, {r:8, c:1}, {r:8, c:0}, {r:7, c:0} 
];

const safeZones = [
    {r:6, c:1}, {r:8, c:2}, {r:1, c:8}, {r:2, c:6}, 
    {r:8, c:13}, {r:6, c:12}, {r:13, c:6}, {r:12, c:8}  
];

const diceFaces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
});

function setBotGameMode(mode) {
    botGameMode = mode;
    document.getElementById('mode-opt-classic').style.border = mode === 'classic' ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.15)';
    document.getElementById('mode-opt-quick').style.border = mode === 'quick' ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.15)';
    
    const titleEl = document.getElementById('game-mode-title');
    if (titleEl) {
        titleEl.innerText = mode === 'quick' ? '⚡ QUICK LUDO (VS AI)' : 'VS COMPUTER (CLASSIC)';
    }
}

function selectBotOpponentCount(count) {
    botCount = count;
    [1, 2, 3].forEach(c => {
        const el = document.getElementById(`bot-count-${c}`);
        if (el) {
            el.style.border = c === count ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.15)';
        }
    });
}

function openBotFastTrackModal() {
    document.getElementById("startup-modal").classList.add("hidden");
    const fastTrack = document.getElementById("bot-fast-track-modal");
    if (fastTrack) {
        fastTrack.classList.remove("hidden");
    } else {
        startBotMatchConfirmed(false);
    }
}

function botUnlockTokenViaAd() {
    if (!navigator.onLine) {
        if (typeof window.showAdToast === 'function') {
            window.showAdToast("⚠️ No internet connection! Please connect to internet to watch video and unlock token.");
        } else {
            alert("⚠️ Internet connection required to watch video and unlock token!");
        }
        return;
    }

    const btn = document.getElementById("bot-unlock-ad-btn");
    if (btn) btn.innerText = "⏳ Loading Video Ad...";

    if (typeof window.showZingRewardedAd === 'function') {
        window.showZingRewardedAd({
            onReward: () => {
                if (btn) btn.innerText = "📺 Watch Ad & Unlock Token";
                const modal = document.getElementById("bot-fast-track-modal");
                if (modal) modal.classList.add("hidden");
                startBotMatchConfirmed(true);
            },
            onFail: () => {
                if (btn) btn.innerText = "📺 Watch Ad & Unlock Token";
            }
        });
    } else {
        if (!navigator.onLine) {
            if (typeof window.showAdToast === 'function') {
                window.showAdToast("⚠️ No internet connection!");
            }
            return;
        }
        const modal = document.getElementById("bot-fast-track-modal");
        if (modal) modal.classList.add("hidden");
        startBotMatchConfirmed(true);
    }
}

function botStartNormally() {
    const modal = document.getElementById("bot-fast-track-modal");
    if (modal) modal.classList.add("hidden");
    startBotMatchConfirmed(false);
}

function startBotMatchConfirmed(unlockOneToken = false) {
    const startupModal = document.getElementById("startup-modal");
    if (startupModal) startupModal.classList.add("hidden");

    if (botCount === 1) {
        activePlayers = ['red', 'yellow'];
        botColors = ['yellow'];
    } else if (botCount === 2) {
        activePlayers = ['red', 'green', 'yellow'];
        botColors = ['green', 'yellow'];
    } else {
        activePlayers = ['red', 'green', 'yellow', 'blue'];
        botColors = ['green', 'yellow', 'blue'];
    }

    winnersList = [];
    totalPlayersInGame = activePlayers.length;

    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        let card = document.getElementById(`profile-${c}`);
        let dice = document.getElementById(`dice-${c}`);
        if (activePlayers.includes(c)) {
            card.style.opacity = "0.5";
            dice.classList.add("visible");
            dice.innerText = "🎲";
        } else {
            card.style.opacity = "0.15";
            dice.classList.remove("visible");
        }
    });

    currentPlayerIndex = 0;
    gameState = 'WAITING_FOR_ROLL';
    isMoving = false;
    spawnTokens(unlockOneToken);
    updateTurnUI();
}

function handleCornerDiceClick(color) {
    if (gameState !== 'WAITING_FOR_ROLL' || isMoving) return;
    let currentColor = activePlayers[currentPlayerIndex];
    if (color !== currentColor || botColors.includes(color)) return;
    rollDice();
}

function updateTurnUI() {
    let currentColor = activePlayers[currentPlayerIndex];
    let pData = playersData[currentColor];
    let isBot = botColors.includes(currentColor);
    
    let turnTextEl = document.getElementById("turn-text");
    turnTextEl.innerText = isBot ? `${pData.name} is calculating move...` : `Your Turn! Tap dice to roll.`;
    turnTextEl.className = `turn-indicator ${pData.class}`;

    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        let card = document.getElementById(`profile-${c}`);
        let dice = document.getElementById(`dice-${c}`);
        if (c === currentColor) {
            card.classList.add("active-turn");
            card.style.opacity = "1";
            dice.classList.add("active-dice");
        } else {
            card.classList.remove("active-turn");
            if (activePlayers.includes(c)) card.style.opacity = "0.5";
            dice.classList.remove("active-dice");
        }
    });

    // If it's a bot's turn, roll automatically with natural human delay!
    if (isBot && gameState === 'WAITING_FOR_ROLL') {
        setTimeout(() => {
            if (gameState === 'WAITING_FOR_ROLL' && botColors.includes(activePlayers[currentPlayerIndex])) {
                rollDice();
            }
        }, 700);
    }
}

function rollDice() {
    if (gameState !== 'WAITING_FOR_ROLL' || isMoving) return;
    gameState = 'ROLLING';

    let currentColor = activePlayers[currentPlayerIndex];
    let diceEl = document.getElementById(`dice-${currentColor}`);
    diceEl.classList.add("rolling");

    soundDice.currentTime = 0;
    soundDice.play().catch(e => {});

    setTimeout(() => {
        diceEl.classList.remove("rolling");
        currentDiceValue = Math.floor(Math.random() * 6) + 1;
        diceEl.innerText = diceFaces[currentDiceValue];
        diceEl.style.color = currentDiceValue === 6 ? "#ff3333" : "#111";

        gameState = 'WAITING_FOR_MOVE';
        checkAvailableMoves();
    }, 600);
}

function checkAvailableMoves() {
    let currentColor = activePlayers[currentPlayerIndex];
    let tokens = allTokens[currentColor];
    let movableTokens = [];

    tokens.forEach((token, index) => {
        if (token.step === -1 && currentDiceValue === 6) movableTokens.push(index);
        else if (token.step !== -1 && token.step + currentDiceValue <= 56) movableTokens.push(index);
    });

    if (movableTokens.length === 0) {
        setTimeout(() => switchTurn(false), 800);
    } else if (botColors.includes(currentColor)) {
        // Smart AI Bot decision
        setTimeout(() => {
            let bestIndex = selectSmartBotMove(currentColor, movableTokens);
            moveToken(currentColor, bestIndex);
        }, 550);
    } else if (movableTokens.length === 1) {
        setTimeout(() => moveToken(currentColor, movableTokens[0]), 300);
    } else {
        movableTokens.forEach(idx => tokens[idx].element.classList.add("highlight-move"));
    }
}

function selectSmartBotMove(color, movableIndices) {
    if (movableIndices.length === 1) return movableIndices[0];

    // Priority 1: Move that captures/cuts an opponent token!
    for (let idx of movableIndices) {
        let t = allTokens[color][idx];
        let simStep = (t.step === -1) ? 0 : (t.step + currentDiceValue);
        if (simStep <= 51) {
            let simGlobal = (playersData[color].startOffset + simStep) % 52;
            let simCoords = masterPath[simGlobal];
            let isSafe = safeZones.some(z => z.r === simCoords.r && z.c === simCoords.c);
            if (!isSafe) {
                for (let enemyColor of activePlayers) {
                    if (enemyColor === color) continue;
                    for (let eToken of allTokens[enemyColor]) {
                        if (eToken.step !== -1 && eToken.step <= 51) {
                            let eGlobal = (playersData[enemyColor].startOffset + eToken.step) % 52;
                            if (eGlobal === simGlobal) {
                                return idx; // Top priority: Capture!
                            }
                        }
                    }
                }
            }
        }
    }

    // Priority 2: Token that reaches HOME (56)
    for (let idx of movableIndices) {
        let t = allTokens[color][idx];
        if (t.step !== -1 && t.step + currentDiceValue === 56) return idx;
    }

    // Priority 3: Release token from base if rolled 6
    if (currentDiceValue === 6) {
        for (let idx of movableIndices) {
            if (allTokens[color][idx].step === -1) return idx;
        }
    }

    // Priority 4: Advance the token furthest ahead
    movableIndices.sort((a, b) => allTokens[color][b].step - allTokens[color][a].step);
    return movableIndices[0];
}

function moveToken(color, tokenIndex) {
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
    let currentStep = startStep;

    let moveInterval = setInterval(() => {
        currentStep++;
        token.step = currentStep;
        renderTokenPosition(token);
        soundMove.currentTime = 0;
        soundMove.play().catch(e => {});

        if (currentStep >= targetStep) {
            clearInterval(moveInterval);
            isMoving = false;

            let extraTurn = (currentDiceValue === 6 || targetStep === 56);
            let cutEnemy = checkCapture(token);
            if (cutEnemy) extraTurn = true;

            if (checkPlayerWon(color)) {
                handlePlayerWin(color);
                return;
            }

            switchTurn(extraTurn);
        }
    }, 180);
}

function checkCapture(token) {
    if (token.step > 51) return false;
    let globalIndex = (playersData[token.color].startOffset + token.step) % 52;
    let currentCoords = masterPath[globalIndex];

    let isSafe = safeZones.some(z => z.r === currentCoords.r && z.c === currentCoords.c);
    if (isSafe) return false;

    let captured = false;
    activePlayers.forEach(enemyColor => {
        if (enemyColor !== token.color) {
            allTokens[enemyColor].forEach(eToken => {
                if (eToken.step !== -1 && eToken.step <= 51) {
                    let enemyGlobal = (playersData[enemyColor].startOffset + eToken.step) % 52;
                    let enemyCoords = masterPath[enemyGlobal];
                    if (enemyCoords.r === currentCoords.r && enemyCoords.c === currentCoords.c) {
                        eToken.step = -1;
                        renderTokenPosition(eToken);
                        soundCut.currentTime = 0;
                        soundCut.play().catch(e => {});
                        captured = true;
                    }
                }
            });
        }
    });
    return captured;
}

function checkPlayerWon(color) {
    if (botGameMode === 'quick') {
        return allTokens[color].filter(t => t.step === 56).length >= 2;
    }
    return allTokens[color].every(t => t.step === 56);
}

function handlePlayerWin(playerColor) {
    if (!winnersList.includes(playerColor)) {
        winnersList.push(playerColor);
        activePlayers = activePlayers.filter(c => c !== playerColor);

        if (winnersList.length >= totalPlayersInGame - 1 || activePlayers.length <= 1) {
            endMatchWithPodium();
        } else {
            switchTurn(false);
        }
    }
}

function endMatchWithPodium() {
    soundWin.play().catch(e => {});
    if (typeof playInterstitialAd === 'function') {
        playInterstitialAd();
    }

    let podiumDiv = document.getElementById("victory-podium");
    podiumDiv.innerHTML = "";

    winnersList.forEach((col, idx) => {
        let badge = idx === 0 ? "🥇 1st Place" : idx === 1 ? "🥈 2nd Place" : "🥉 3rd Place";
        podiumDiv.innerHTML += `<div style="padding: 6px; font-weight: bold; color: #ffd700;">${badge}: ${playersData[col].name}</div>`;
    });

    if (activePlayers.length > 0) {
        podiumDiv.innerHTML += `<div style="padding: 6px; color: #94a3b8;">Runner Up: ${playersData[activePlayers[0]].name}</div>`;
    }

    document.getElementById("victory-modal").classList.remove("hidden");
}

function switchTurn(extraTurn) {
    if (!extraTurn) {
        currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
    }
    gameState = 'WAITING_FOR_ROLL';
    isMoving = false;
    updateTurnUI();
}

function createBoard() {
    const board = document.getElementById("ludo-board");
    board.innerHTML = "";

    board.appendChild(createYard("red", 0, 0));
    board.appendChild(createYard("green", 0, 9));
    board.appendChild(createYard("blue", 9, 0));
    board.appendChild(createYard("yellow", 9, 9));

    const center = document.createElement("div");
    center.className = "center-home";
    board.appendChild(center);

    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8) || (r >= 6 && r <= 8 && c >= 6 && c <= 8)) {
                continue;
            }
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.style.gridRowStart = r + 1;
            cell.style.gridColumnStart = c + 1;

            if (r === 7 && c >= 1 && c <= 5) cell.classList.add("home-red");
            if (c === 7 && r >= 1 && r <= 5) cell.classList.add("home-green");
            if (r === 7 && c >= 9 && c <= 13) cell.classList.add("home-yellow");
            if (c === 7 && r >= 9 && r <= 13) cell.classList.add("home-blue");

            if (r === 6 && c === 1) cell.classList.add("start-red");
            if (r === 1 && c === 8) cell.classList.add("start-green");
            if (r === 8 && c === 13) cell.classList.add("start-yellow");
            if (r === 13 && c === 6) cell.classList.add("start-blue");

            if ((r === 8 && c === 2) || (r === 2 && c === 6) || (r === 6 && c === 12) || (r === 12 && c === 8)) {
                cell.classList.add("safe-cell");
            }

            board.appendChild(cell);
        }
    }
}

function createYard(color, r, c) {
    const yard = document.createElement("div");
    yard.className = `yard ${color}`;
    yard.style.gridRow = `${r + 1} / span 6`;
    yard.style.gridColumn = `${c + 1} / span 6`;

    const inner = document.createElement("div");
    inner.className = "yard-inner";

    for (let i = 0; i < 4; i++) {
        const spot = document.createElement("div");
        spot.className = "yard-spot";
        spot.id = `yard-spot-${color}-${i}`;
        inner.appendChild(spot);
    }

    yard.appendChild(inner);
    return yard;
}

function spawnTokens(unlockOneToken) {
    const board = document.getElementById("ludo-board");
    document.querySelectorAll(".token").forEach(e => e.remove());

    ['red', 'green', 'yellow', 'blue'].forEach(color => {
        allTokens[color] = [];
        if (!activePlayers.includes(color)) return;

        for (let i = 0; i < 4; i++) {
            const tokenEl = document.createElement("div");
            tokenEl.className = `token ${color}-token`;
            tokenEl.id = `token-${color}-${i}`;
            tokenEl.innerText = i + 1;
            tokenEl.onclick = () => {
                if (color === 'red') {
                    moveToken(color, i);
                }
            };

            board.appendChild(tokenEl);

            const tokenObj = {
                color: color,
                index: i,
                step: (unlockOneToken && i === 0) ? 0 : -1,
                element: tokenEl
            };
            allTokens[color].push(tokenObj);
            renderTokenPosition(tokenObj);
        }
    });
}

function renderTokenPosition(token) {
    const el = token.element;
    if (token.step === -1) {
        const spot = document.getElementById(`yard-spot-${token.color}-${token.index}`);
        if (spot) {
            const rect = spot.getBoundingClientRect();
            const boardRect = document.getElementById("ludo-board").getBoundingClientRect();
            el.style.top = `${rect.top - boardRect.top + 2}px`;
            el.style.left = `${rect.left - boardRect.left + 2}px`;
        }
    } else if (token.step === 56) {
        const boardRect = document.getElementById("ludo-board").getBoundingClientRect();
        const centerOffset = 0.44 * boardRect.width;
        el.style.top = `${centerOffset}px`;
        el.style.left = `${centerOffset}px`;
    } else if (token.step <= 50) {
        let globalIndex = (playersData[token.color].startOffset + token.step) % 52;
        let coords = masterPath[globalIndex];
        positionTokenOnGrid(el, coords.r, coords.c);
    } else {
        let homeIndex = token.step - 51;
        let coords = getHomePathCoords(token.color, homeIndex);
        positionTokenOnGrid(el, coords.r, coords.c);
    }
}

function positionTokenOnGrid(el, r, c) {
    const board = document.getElementById("ludo-board");
    const cellWidth = board.clientWidth / 15;
    const cellHeight = board.clientHeight / 15;

    el.style.top = `${r * cellHeight + 3}px`;
    el.style.left = `${c * cellWidth + 3}px`;
}

function getHomePathCoords(color, index) {
    if (color === 'red') return { r: 7, c: 1 + index };
    if (color === 'green') return { r: 1 + index, c: 7 };
    if (color === 'yellow') return { r: 7, c: 13 - index };
    if (color === 'blue') return { r: 13 - index, c: 7 };
}
