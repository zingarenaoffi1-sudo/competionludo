let activePlayers = [];
let currentPlayerIndex = 0;
let gameState = 'WAITING_FOR_ROLL';
let currentDiceValue = 0;
let isMoving = false;
const allTokens = {};

let winnersList = [];
let totalPlayersInGame = 0;
let pendingPlayerCount = 4;
let selectedLocalMode = 'classic'; // 'classic', 'quick', 'team2v2', 'bot'
let botColors = [];

const soundDice = new Audio('sounds/board game dice_2.mp3');
const soundMove = new Audio('sounds/ui pop_2.mp3');
const soundCut = new Audio('sounds/cartoon bonk.mp3');
const soundWin = new Audio('sounds/success chime_2.mp3');

const playersData = {
    'red': { name: "Red", label: "Player 1", class: "red-text", startOffset: 0 },
    'green': { name: "Green", label: "Player 2", class: "green-text", startOffset: 13 },
    'yellow': { name: "Yellow", label: "Player 3", class: "yellow-text", startOffset: 26 },
    'blue': { name: "Blue", label: "Player 4", class: "blue-text", startOffset: 39 }
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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'bot') {
        setLocalGameMode('bot');
    }
});

function setLocalGameMode(mode) {
    selectedLocalMode = mode;
    ['classic', 'quick', 'team', 'bot'].forEach(m => {
        const el = document.getElementById(`mode-opt-${m}`);
        if (el) {
            if ((mode === 'team2v2' && m === 'team') || m === mode) {
                el.style.border = '2px solid #ffd700';
            } else {
                el.style.border = '1px solid rgba(255,255,255,0.15)';
            }
        }
    });

    const titleEl = document.getElementById('game-mode-title');
    if (titleEl) {
        if (mode === 'quick') titleEl.innerText = '⚡ QUICK LUDO';
        else if (mode === 'team2v2') titleEl.innerText = '🤝 2 vs 2 TEAM UP';
        else if (mode === 'bot') titleEl.innerText = '🤖 vs COMPUTER';
        else titleEl.innerText = 'PASS & PLAY';
    }

    const btn3p = document.getElementById('btn-3p');
    if (btn3p) {
        btn3p.style.display = (mode === 'team2v2') ? 'none' : 'block';
    }
}

function choosePlayerCount(count) {
    pendingPlayerCount = count;
    document.getElementById("startup-modal").classList.add("hidden");
    document.getElementById("fast-track-modal").classList.remove("hidden");
}

function unlockTokenViaAd() {
    // 1. Strict internet check
    if (!navigator.onLine) {
        if (typeof window.showAdToast === 'function') {
            window.showAdToast("⚠️ इंटरनेट कनेक्शन बंद है! वीडियो देखने और गोटी निकालने के लिए इंटरनेट चालू करें।");
        } else {
            alert("⚠️ Internet connection required to watch video and unlock goti!");
        }
        return;
    }

    const btn = document.getElementById("local-unlock-ad-btn");
    if (btn) btn.innerText = "⏳ Loading Video Ad...";

    // 2. Play Rewarded Ad via Central Controller
    if (typeof window.showZingRewardedAd === 'function') {
        window.showZingRewardedAd({
            onReward: () => {
                if (btn) btn.innerText = "📺 Watch Ad & Unlock Token";
                document.getElementById("fast-track-modal").classList.add("hidden");
                startLocalGame(pendingPlayerCount, true);
            },
            onFail: (err) => {
                if (btn) btn.innerText = "📺 Watch Ad & Unlock Token";
                // Do NOT unlock token and do NOT start game on ad failure!
            }
        });
    } else {
        // Fallback only if online
        if (!navigator.onLine) {
            if (typeof window.showAdToast === 'function') {
                window.showAdToast("⚠️ इंटरनेट कनेक्शन बंद है!");
            }
            return;
        }
        document.getElementById("fast-track-modal").classList.add("hidden");
        startLocalGame(pendingPlayerCount, true);
    }
}

function startSessionNormally() {
    document.getElementById("fast-track-modal").classList.add("hidden");
    startLocalGame(pendingPlayerCount, false);
}

function startLocalGame(playerCount, unlockOneToken) {
    if (playerCount === 2) activePlayers = ['red', 'yellow'];
    else if (playerCount === 3) activePlayers = ['red', 'green', 'yellow'];
    else activePlayers = ['red', 'green', 'yellow', 'blue'];

    if (selectedLocalMode === 'bot') {
        botColors = activePlayers.filter(c => c !== 'red');
        playersData['red'].name = "You";
        botColors.forEach((bc, idx) => {
            playersData[bc].name = `AI Bot ${idx + 1}`;
        });
    } else {
        botColors = [];
        playersData['red'].name = "Red";
        playersData['green'].name = "Green";
        playersData['yellow'].name = "Yellow";
        playersData['blue'].name = "Blue";
    }

    initGameSession(unlockOneToken);
}

function initGameSession(unlockOneToken) {
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
    if (color !== currentColor) return;
    rollDice();
}

function updateTurnUI() {
    let currentColor = activePlayers[currentPlayerIndex];
    let pData = playersData[currentColor];
    let isBot = botColors.includes(currentColor);
    
    let turnTextEl = document.getElementById("turn-text");
    turnTextEl.innerText = isBot ? `${pData.name} is thinking...` : `${pData.name}'s Turn - Roll Dice!`;
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

    if (isBot && gameState === 'WAITING_FOR_ROLL') {
        setTimeout(() => {
            if (gameState === 'WAITING_FOR_ROLL' && botColors.includes(activePlayers[currentPlayerIndex])) {
                rollDice();
            }
        }, 650);
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
        // Smart AI bot decision engine
        setTimeout(() => {
            let bestIndex = selectSmartBotMove(currentColor, movableTokens);
            moveToken(currentColor, bestIndex);
        }, 500);
    } else if (movableTokens.length === 1) {
        setTimeout(() => moveToken(currentColor, movableTokens[0]), 300);
    } else {
        movableTokens.forEach(idx => tokens[idx].element.classList.add("highlight-move"));
    }
}

function selectSmartBotMove(color, movableIndices) {
    if (movableIndices.length === 1) return movableIndices[0];

    // Priority 1: Move that captures an opponent
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
                    if (selectedLocalMode === 'team2v2') {
                        const isTeammate = (color === 'red' && enemyColor === 'yellow') || (color === 'yellow' && enemyColor === 'red') || (color === 'green' && enemyColor === 'blue') || (color === 'blue' && enemyColor === 'green');
                        if (isTeammate) continue;
                    }
                    for (let eToken of allTokens[enemyColor]) {
                        if (eToken.step !== -1 && eToken.step <= 51) {
                            let eGlobal = (playersData[enemyColor].startOffset + eToken.step) % 52;
                            if (eGlobal === simGlobal) {
                                return idx; // Highest priority: CUT!
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
            // In 2v2 team mode, partners cannot cut each other!
            if (selectedLocalMode === 'team2v2') {
                const isTeammate = (token.color === 'red' && enemyColor === 'yellow') ||
                                   (token.color === 'yellow' && enemyColor === 'red') ||
                                   (token.color === 'green' && enemyColor === 'blue') ||
                                   (token.color === 'blue' && enemyColor === 'green');
                if (isTeammate) return;
            }
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
    if (selectedLocalMode === 'quick') {
        // Quick Ludo: 2 tokens home is a win!
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
    updateTurnUI();
}

function spawnTokens(unlockOneToken) {
    ['red', 'green', 'yellow', 'blue'].forEach(color => {
        allTokens[color] = [];
        for (let i = 0; i < 4; i++) {
            let tokenEl = document.createElement("div");
            tokenEl.classList.add("token", `token-${color}`);
            tokenEl.addEventListener("click", () => moveToken(color, i));

            let initialStep = -1;
            if (unlockOneToken && i === 0 && activePlayers.includes(color)) {
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

function renderTokenPosition(token) {
    const board = document.getElementById("ludo-board");
    if (!board || !token || !token.element) return;
    const boardRect = board.getBoundingClientRect();

    let targetEl = null;
    if (token.step === -1) {
        targetEl = document.getElementById(`slot-${token.color}-${token.index}`);
    } else if (token.step <= 51) {
        let globalIndex = (playersData[token.color].startOffset + token.step) % 52;
        let coords = masterPath[globalIndex];
        targetEl = document.getElementById(`cell-${coords.r}-${coords.c}`);
    } else {
        let homeIndex = token.step - 52;
        if (homeIndex < 5) {
            if (token.color === 'red') targetEl = document.getElementById(`cell-7-${homeIndex + 1}`);
            if (token.color === 'green') targetEl = document.getElementById(`cell-${homeIndex + 1}-7`);
            if (token.color === 'yellow') targetEl = document.getElementById(`cell-7-${13 - homeIndex}`);
            if (token.color === 'blue') targetEl = document.getElementById(`cell-${13 - homeIndex}-7`);
        } else {
            targetEl = document.getElementById(`cell-7-7`);
        }
    }

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        // Exact coordinate calculation relative to ludo-board container
        const left = (rect.left - boardRect.left) + (rect.width / 2) - 10;
        const top = (rect.top - boardRect.top) + (rect.height / 2) - 10;
        token.element.style.left = `${left}px`;
        token.element.style.top = `${top}px`;
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
            slot.id = `slot-${b.color}-${i}`;
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
            cell.id = `cell-${r}-${c}`;
            cell.style.gridArea = `${r + 1} / ${c + 1} / ${r + 2} / ${c + 2}`;

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
