let activePlayers = [];
let currentPlayerIndex = 0;
let gameState = 'WAITING_FOR_ROLL';
let currentDiceValue = 0;
let isMoving = false;
const allTokens = {};

let turnTimer = null;
let countdownInterval = null;
let timeLeft = 25;
const missedTurns = {};

let myAssignedColor = ""; 
let currentOnlineRoomId = "";

const soundDice = new Audio('sounds/board game dice_2.mp3');
const soundMove = new Audio('sounds/ui pop_2.mp3');
const soundCut = new Audio('sounds/cartoon bonk.mp3');
const soundWin = new Audio('sounds/success chime_2.mp3');

const playersData = {
    'red': { name: "RED'S TURN", class: "red-text", startOffset: 0 },
    'green': { name: "GREEN'S TURN", class: "green-text", startOffset: 13 },
    'yellow': { name: "YELLOW'S TURN", class: "yellow-text", startOffset: 26 },
    'blue': { name: "BLUE'S TURN", class: "blue-text", startOffset: 39 }
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

let socket = null;

let lastAdTime = 0;
function triggerInterstitialAd(reason) {
    console.log("Interstitial ad triggered for:", reason);
    let now = Date.now();
    if (now - lastAdTime < 15000) {
        console.log("Ad skipped due to rapid click protection.");
        return;
    }
    lastAdTime = now;
    if (typeof window.showAd === 'function') {
        window.showAd();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
    document.getElementById("dice-container").addEventListener("click", rollDice);

    const socketUrl = (window.location.protocol.startsWith('http') && !window.location.href.includes('capacitor'))
        ? window.location.origin
        : 'https://competionludo.onrender.com';
    socket = io(socketUrl);
    setupSocketListeners();
});

function showQuickMatch() {
    document.getElementById('online-main-options').classList.add('hidden');
    document.getElementById('quick-match-sub').classList.remove('hidden');
}

function showCreateRoomOptions() {
    document.getElementById('online-main-options').classList.add('hidden');
    document.getElementById('create-room-sub').classList.remove('hidden');
}

function showJoinRoomInput() {
    document.getElementById('online-main-options').classList.add('hidden');
    document.getElementById('join-room-sub').classList.remove('hidden');
}

function backToOnlineMain() {
    document.getElementById('quick-match-sub').classList.add('hidden');
    document.getElementById('create-room-sub').classList.add('hidden');
    document.getElementById('join-room-sub').classList.add('hidden');
    document.getElementById('online-main-options').classList.remove('hidden');
    document.getElementById('quick-match-display').innerText = '';
    document.getElementById('room-created-display').innerText = '';
}

function findOnlineMatch(playersCount) {
    document.getElementById('quick-match-display').innerText = `Searching for ${playersCount} players... Please wait.`;
    socket.emit('find-match', { playersRequired: playersCount });
}

function createPrivateRoom(playersCount) {
    socket.emit('create-room', { maxPlayers: playersCount });
}

function joinPrivateRoom() {
    let roomId = document.getElementById('room-id-input').value.trim();
    if (roomId) {
        socket.emit('join-room', { roomId: roomId });
    } else {
        alert("Please enter a valid Room ID!");
    }
}

function setupSocketListeners() {
    socket.on('room-created', (data) => {
        myAssignedColor = data.color;
        currentOnlineRoomId = data.roomId;
        document.getElementById('room-created-display').innerHTML = `Room Code: <span style="color:#ffcc00; font-size:16px;">${data.roomId}</span><br>Share this code with friends! Waiting for players to join...`;
    });

    socket.on('match-found', (data) => {
        myAssignedColor = data.color;
        currentOnlineRoomId = data.roomId;
    });

    socket.on('joined-success', (data) => {
        myAssignedColor = data.color;
        currentOnlineRoomId = data.roomId;
        document.getElementById('online-modal').classList.add('hidden');
        alert(`Joined room ${data.roomId} successfully! Waiting for host to start...`);
    });

    socket.on('start-online-game', (data) => {
        document.getElementById('online-modal').classList.add('hidden');
        triggerInterstitialAd("Online Game Started");

        activePlayers = data.players.map(p => p.color);
        showMyIdentity(myAssignedColor);
        initGameSessionOnline();
    });

    socket.on('remote-dice-rolled', (data) => {
        currentDiceValue = data.diceValue;
        soundDice.currentTime = 0;
        soundDice.play().catch(e => {});

        const diceContainer = document.getElementById("dice-container");
        diceContainer.classList.remove("rolling");
        diceContainer.innerText = diceFaces[currentDiceValue];
        diceContainer.style.color = currentDiceValue === 6 ? "#ff2a2a" : "#111";

        gameState = 'WAITING_FOR_MOVE';
        startTurnTimer();
        checkAvailableMovesOnline();
    });

    socket.on('remote-token-moved', (data) => {
        moveTokenStepByStepRemote(data.color, data.tokenIndex, data.diceVal, data.cutDetails);
    });

    socket.on('turn-updated', (data) => {
        currentPlayerIndex = activePlayers.indexOf(data.currentColor);
        updateTurnText();
        gameState = 'WAITING_FOR_ROLL';
        startTurnTimer();
    });

    socket.on('player-eliminated', (data) => {
        alert(`🚨 ${data.color.toUpperCase()} has been eliminated from the match!`);
        activePlayers = activePlayers.filter(c => c !== data.color);
        let profileEl = document.getElementById(`profile-${data.color}`);
        if (profileEl) profileEl.style.opacity = "0.1";
        if (allTokens[data.color]) {
            allTokens[data.color].forEach(t => {
                if (t.element && t.element.parentNode) t.element.parentNode.removeChild(t.element);
            });
        }
    });

    socket.on('game-over-broadcast', (data) => {
        soundWin.play().catch(e => {});
        alert(`🏆 GAME OVER! 🏆\nWinner: ${data.winnerColor ? data.winnerColor.toUpperCase() : 'Player'}`);
        triggerInterstitialAd("Online Game Finished");
        setTimeout(() => window.location.reload(), 2000);
    });
}

function showMyIdentity(color) {
    const badge = document.getElementById('my-identity-badge');
    badge.classList.remove('hidden');
    let playerNum = (color === 'red') ? "Player 1" : (color === 'green') ? "Player 2" : (color === 'yellow') ? "Player 3" : "Player 4";
    badge.innerText = `👉 YOU ARE: ${playerNum} (${color.toUpperCase()}) 👈`;
}

function initGameSessionOnline() {
    activePlayers.forEach(c => document.getElementById(`profile-${c}`).style.opacity = "1");
    activePlayers.forEach(c => missedTurns[c] = 0);

    currentPlayerIndex = 0;
    gameState = 'WAITING_FOR_ROLL';
    isMoving = false;
    updateTurnText();
    spawnTokens();
    startTurnTimer();
}

function startTurnTimer() {
    clearTurnTimer();
    timeLeft = 25;
    updateTimerUI();
    countdownInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) clearInterval(countdownInterval);
    }, 1000);

    let currentColor = activePlayers[currentPlayerIndex];
    turnTimer = setTimeout(() => {
        handleTurnTimeout(currentColor);
    }, 25000);
}

function clearTurnTimer() {
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

function updateTimerUI() {
    let timerEl = document.getElementById("timer-text");
    if (timerEl) timerEl.innerText = `⏳ Time left: ${timeLeft}s`;
}

function handleTurnTimeout(color) {
    if (socket && currentOnlineRoomId) return; 

    if (!missedTurns[color]) missedTurns[color] = 0;
    missedTurns[color]++;

    if (missedTurns[color] >= 3) {
        clearTurnTimer();
        alert(`🚨 ${color.toUpperCase()} missed 3 turns and has been eliminated from the game!`);
        
        if (allTokens[color]) {
            allTokens[color].forEach(t => {
                if (t.element && t.element.parentNode) t.element.parentNode.removeChild(t.element);
            });
        }
        let profileEl = document.getElementById(`profile-${color}`);
        if (profileEl) profileEl.style.opacity = "0.1";

        activePlayers = activePlayers.filter(c => c !== color);
        if (activePlayers.length === 1) {
            endMatchAndGoToMenu();
            return;
        }
        if (currentPlayerIndex >= activePlayers.length) currentPlayerIndex = 0;
        updateTurnText();
        gameState = 'WAITING_FOR_ROLL';
        startTurnTimer();
        return;
    }

    alert(`⚠️ ${color.toUpperCase()} skipped their turn due to inactivity (${missedTurns[color]}/3).`);
    switchTurnLocal(false);
}

function endMatchAndGoToMenu() {
    clearTurnTimer();
    soundWin.play().catch(e => {});
    triggerInterstitialAd("Match Finished");
    setTimeout(() => {
        alert("🏆 MATCH FINISHED! 🏆");
        window.location.reload(); 
    }, 1500);
}

function createBoard() {
    const board = document.getElementById("ludo-board");
    board.innerHTML = ""; 
    createBase(board, 'red-base', 'red');
    createBase(board, 'green-base', 'green');
    createBase(board, 'blue-base', 'blue');
    createBase(board, 'yellow-base', 'yellow');

    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8)) continue; 
            const cell = document.createElement("div");
            cell.classList.add("ludo-cell");
            cell.id = `cell-${r}-${c}`; 
            cell.style.gridArea = `${r + 1} / ${c + 1} / span 1 / span 1`;

            if (r === 7 && c > 0 && c < 6) cell.style.backgroundColor = "#ff4d4d"; 
            if (c === 7 && r > 0 && r < 6) cell.style.backgroundColor = "#4dff4d"; 
            if (r === 7 && c > 8 && c < 14) cell.style.backgroundColor = "#ffff4d"; 
            if (c === 7 && r > 8 && r < 14) cell.style.backgroundColor = "#4d4dff"; 

            let isSafe = safeZones.some(zone => zone.r === r && zone.c === c);
            if (isSafe) {
                cell.style.backgroundColor = "#e0e0e0"; 
                let star = document.createElement("span");
                star.className = "safe-zone-icon";
                star.innerHTML = "⭐"; 
                cell.appendChild(star);
            }
            if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cell.style.background = "#222";
            board.appendChild(cell);
        }
    }
}

function createBase(board, colorClass, colorId) {
    const base = document.createElement("div");
    base.classList.add("base", colorClass);
    base.id = colorId + "-base";
    const innerBox = document.createElement("div");
    innerBox.classList.add("inner-base");
    for(let i = 0; i < 4; i++) {
        const slot = document.createElement("div");
        slot.classList.add("token-slot");
        slot.id = `${colorId}-slot-${i}`;
        innerBox.appendChild(slot);
    }
    base.appendChild(innerBox);
    board.appendChild(base);
}

function spawnTokens() {
    activePlayers.forEach(color => {
        allTokens[color] = [];
        for (let i = 0; i < 4; i++) {
            let token = document.createElement("div");
            token.className = `token token-${color}`;
            token.id = `token-${color}-${i}`;
            token.addEventListener('click', () => handleTokenClick(color, i));
            document.getElementById(`${color}-slot-${i}`).appendChild(token);
            allTokens[color].push({ element: token, state: 'home', pathPosition: -1 });
        }
    });
}

function rollDice() {
    if (socket && currentOnlineRoomId) {
        if (myAssignedColor !== activePlayers[currentPlayerIndex]) {
            alert("Wait! It's not your turn.");
            return;
        }
    }

    if (activePlayers.length === 0 || gameState !== 'WAITING_FOR_ROLL' || isMoving) return;
    clearTurnTimer(); 
    gameState = 'ROLLING';
    const diceContainer = document.getElementById("dice-container");
    diceContainer.classList.add("rolling");

    if (socket && currentOnlineRoomId) {
        socket.emit('request-dice-roll', { roomId: currentOnlineRoomId });
    } else {
        setTimeout(() => {
            soundDice.currentTime = 0;
            soundDice.play().catch(e => {});
            
            diceContainer.classList.remove("rolling");
            currentDiceValue = Math.floor(Math.random() * 6) + 1; 
            diceContainer.innerText = diceFaces[currentDiceValue];
            diceContainer.style.color = currentDiceValue === 6 ? "#ff2a2a" : "#111";
            gameState = 'WAITING_FOR_MOVE';
            startTurnTimer(); 
            checkAvailableMovesLocal();
        }, 500); 
    }
}

function checkAvailableMovesOnline() {
    let currentPlayerColor = activePlayers[currentPlayerIndex];
    let movableTokens = [];
    allTokens[currentPlayerColor].forEach((tokenObj, index) => {
        if (tokenObj.state === 'home' && currentDiceValue === 6) movableTokens.push(index); 
        else if (tokenObj.state === 'active' && tokenObj.pathPosition + currentDiceValue <= 56) movableTokens.push(index); 
    });

    if (movableTokens.length > 0) {
        movableTokens.forEach(idx => allTokens[currentPlayerColor][idx].element.classList.add('highlight-move'));
        if (movableTokens.length === 1 && currentPlayerColor === myAssignedColor) {
            setTimeout(() => handleTokenClick(currentPlayerColor, movableTokens[0]), 300);
        }
    }
}

function checkAvailableMovesLocal() {
    let currentPlayerColor = activePlayers[currentPlayerIndex];
    let movableTokens = [];
    allTokens[currentPlayerColor].forEach((tokenObj, index) => {
        if (tokenObj.state === 'home' && currentDiceValue === 6) movableTokens.push(index); 
        else if (tokenObj.state === 'active') movableTokens.push(index); 
    });

    if (movableTokens.length === 0) {
        setTimeout(() => switchTurnLocal(false), 500);
    } else {
        movableTokens.forEach(idx => allTokens[currentPlayerColor][idx].element.classList.add('highlight-move'));
        if (movableTokens.length === 1) {
            setTimeout(() => handleTokenClick(currentPlayerColor, movableTokens[0]), 300);
        }
    }
}

function handleTokenClick(color, tokenIndex) {
    if (socket && currentOnlineRoomId && color !== myAssignedColor) return;
    if (gameState !== 'WAITING_FOR_MOVE' || color !== activePlayers[currentPlayerIndex] || isMoving) return;

    let tokenObj = allTokens[color][tokenIndex];
    if (!tokenObj.element.classList.contains('highlight-move')) return; 

    allTokens[color].forEach(t => t.element.classList.remove('highlight-move'));

    if (socket && currentOnlineRoomId) {
        socket.emit('request-token-move', {
            roomId: currentOnlineRoomId,
            color: color,
            tokenIndex: tokenIndex
        });
    } else {
        clearTurnTimer(); 
        if (tokenObj.state === 'home' && currentDiceValue === 6) {
            tokenObj.state = 'active';
            tokenObj.pathPosition = 0; 
            updateTokenUI(color, tokenIndex);
            switchTurnLocal(true); 
        } else {
            moveTokenStepByStepLocal(color, tokenIndex, currentDiceValue);
        }
    }
}

function moveTokenStepByStepRemote(color, tokenIndex, diceVal, cutDetails) {
    let tokenObj = allTokens[color][tokenIndex];
    allTokens[color].forEach(t => t.element.classList.remove('highlight-move'));

    if (tokenObj.state === 'home' && diceVal === 6) {
        tokenObj.state = 'active';
        tokenObj.pathPosition = 0; 
        updateTokenUI(color, tokenIndex);
    } else {
        isMoving = true; 
        let stepsTaken = 0;
        let moveInterval = setInterval(() => {
            stepsTaken++;
            tokenObj.pathPosition++;
            updateTokenUI(color, tokenIndex);

            if (stepsTaken >= diceVal) {
                clearInterval(moveInterval);
                setTimeout(() => {
                    if (cutDetails) {
                        let enemyToken = allTokens[cutDetails.color][cutDetails.index];
                        enemyToken.state = 'home';
                        enemyToken.pathPosition = -1;
                        document.getElementById(`${cutDetails.color}-slot-${cutDetails.index}`).appendChild(enemyToken.element);
                        
                        soundCut.play().catch(e => {});
                    }
                    if (tokenObj.pathPosition >= 56) tokenObj.element.style.display = "none"; 
                    isMoving = false; 
                }, 300);
            }
        }, 250); 
    }
}

function moveTokenStepByStepLocal(color, tokenIndex, stepsToMove) {
    isMoving = true; 
    let tokenObj = allTokens[color][tokenIndex];
    let stepsTaken = 0;

    let moveInterval = setInterval(() => {
        stepsTaken++;
        tokenObj.pathPosition++;
        updateTokenUI(color, tokenIndex);

        if (stepsTaken >= stepsToMove) {
            clearInterval(moveInterval);
            setTimeout(() => {
                let cutHappened = checkCaptureLocal(color, tokenIndex);
                if (tokenObj.pathPosition >= 56) {
                    tokenObj.element.style.display = "none"; 
                }
                isMoving = false; 
                switchTurnLocal(cutHappened || currentDiceValue === 6);
            }, 300);
        }
    }, 250); 
}

function updateTokenUI(color, tokenIndex) {
    soundMove.currentTime = 0;
    soundMove.play().catch(e => {});

    let tokenObj = allTokens[color][tokenIndex];
    let startOffset = playersData[color].startOffset;
    let globalPos = (startOffset + tokenObj.pathPosition) % 52;
    if(tokenObj.pathPosition > 50) globalPos = 51; 
    let targetCoords = masterPath[globalPos];
    
    let targetCell = document.getElementById(`cell-${targetCoords.r}-${targetCoords.c}`);
    if (targetCell) {
        targetCell.appendChild(tokenObj.element); 
        tokenObj.element.classList.add('moving');
        setTimeout(() => tokenObj.element.classList.remove('moving'), 200); 
    }
}

function checkCaptureLocal(color, tokenIndex) {
    let attacker = allTokens[color][tokenIndex];
    let startOffset = playersData[color].startOffset;
    let globalPos = (startOffset + attacker.pathPosition) % 52;
    let targetCoords = masterPath[globalPos];
    let isSafe = safeZones.some(zone => zone.r === targetCoords.r && zone.c === targetCoords.c);
    
    if (isSafe) return false; 
    let cutHappened = false;

    for (let enemyColor of activePlayers) {
        if (enemyColor === color) continue; 
        allTokens[enemyColor].forEach((enemyToken, enemyIndex) => {
            if (enemyToken.state === 'active') {
                let enemyGlobalPos = (playersData[enemyColor].startOffset + enemyToken.pathPosition) % 52;
                if (enemyGlobalPos === globalPos) {
                    cutHappened = true;
                    soundCut.play().catch(e => {});
                    
                    enemyToken.state = 'home';
                    enemyToken.pathPosition = -1;
                    document.getElementById(`${enemyColor}-slot-${enemyIndex}`).appendChild(enemyToken.element);
                }
            }
        });
    }
    return cutHappened;
}

function switchTurnLocal(gotExtraTurn) {
    clearTurnTimer(); 
    if (!gotExtraTurn) currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
    updateTurnText();
    gameState = 'WAITING_FOR_ROLL';
    startTurnTimer(); 
}

function updateTurnText() {
    let currentPlayerColor = activePlayers[currentPlayerIndex];
    const turnText = document.getElementById("turn-text");
    if(turnText) {
        turnText.innerText = playersData[currentPlayerColor].name;
        turnText.className = playersData[currentPlayerColor].class;
    }
}
