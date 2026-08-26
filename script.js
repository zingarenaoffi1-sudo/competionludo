/* =========================================
   ULTRA LUDO PRO - MASTER LOGIC ENGINE + LIVE TIMER 
========================================= */

let activePlayers = []; 
let currentPlayerIndex = 0; 
let gameState = 'WAITING_FOR_ROLL'; 
let currentDiceValue = 0;
let isMoving = false; 
const allTokens = {}; 

let socket;
let myAssignedColor = "";
window.currentRoomId = "";

// 🔥 VISUAL TIMER
let turnTimer = null; // Local use only
let countdownInterval = null;
let timeLeft = 25;
const missedTurns = {}; 

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

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
    document.getElementById("dice-container").addEventListener("click", rollDice);
});

// --- MENU NAVIGATION FUNCTIONS ---
function showLocalPlayerModal() {
    document.getElementById("mode-selection-modal").classList.add("hidden");
    document.getElementById("startup-modal").classList.remove("hidden");
}

function showOnlineMenu() {
    document.getElementById("mode-selection-modal").classList.add("hidden");
    document.getElementById("online-modal").classList.remove("hidden");
    showOnlineMainOptions();
}

function showOnlineMainOptions() {
    document.getElementById("quick-match-sub").classList.add("hidden");
    document.getElementById("create-room-sub").classList.add("hidden");
    document.getElementById("join-room-sub").classList.add("hidden");
    document.getElementById("online-main-options").classList.remove("hidden");
}

function showQuickMatch() {
    document.getElementById("online-main-options").classList.add("hidden");
    document.getElementById("quick-match-sub").classList.remove("hidden");
}
function showCreateRoomOptions() {
    document.getElementById("online-main-options").classList.add("hidden");
    document.getElementById("create-room-sub").classList.remove("hidden");
}
function showJoinRoomInput() {
    document.getElementById("online-main-options").classList.add("hidden");
    document.getElementById("join-room-sub").classList.remove("hidden");
}

function backToOnlineMain() {
    if (socket) socket.emit('cancel-action'); 
    showOnlineMainOptions();
}

function backToModeSelect() {
    if (socket) socket.emit('cancel-action');
    document.getElementById("startup-modal").classList.add("hidden");
    document.getElementById("online-modal").classList.add("hidden");
    document.getElementById("mode-selection-modal").classList.remove("hidden");
}

// --- SOCKET.IO CONNECTION ---
function findOnlineMatch(count) { 
    connectToServer();
    document.getElementById("quick-match-display").innerText = "Matchmaking pls wait... ⏳";
    socket.emit('find-match', { playersRequired: count });
}

function connectToServer() {
    if (!socket) {
        socket = io('https://competionludo.onrender.com');

        socket.on('room-created', (data) => {
            window.currentRoomId = data.roomId;
            myAssignedColor = data.color;
            showMyIdentity(data.color);
        });

        socket.on('joined-success', (data) => {
            window.currentRoomId = data.roomId;
            myAssignedColor = data.color;
            showMyIdentity(data.color);
        });

        socket.on('match-found', (data) => {
            window.currentRoomId = data.roomId;
            myAssignedColor = data.color;
            showMyIdentity(data.color);
        });

        socket.on('start-online-game', (data) => {
            document.getElementById("online-modal").classList.add("hidden");
            document.getElementById("mode-selection-modal").classList.add("hidden");
            
            activePlayers = data.players.map(p => p.color);
            let me = data.players.find(p => p.id === socket.id);
            if (me) showMyIdentity(me.color);
            initGameSession();
        });

        // 🚨 NEW SERVER ENGINE SYNC
        socket.on('remote-dice-rolled', handleRemoteDice);
        socket.on('remote-token-moved', handleRemoteTokenMove);
        socket.on('turn-updated', (data) => {
            currentPlayerIndex = activePlayers.indexOf(data.currentColor);
            updateTurnText();
            gameState = 'WAITING_FOR_ROLL';
            startTurnTimer(); 
        });
        socket.on('player-eliminated', (data) => {
            alert(`🚨 ${data.color.toUpperCase()} was eliminated!`);
            activePlayers = activePlayers.filter(c => c !== data.color);
            let profileEl = document.getElementById(`profile-${data.color}`);
            if (profileEl) profileEl.style.opacity = "0.1";
            if (allTokens[data.color]) {
                allTokens[data.color].forEach(t => {
                    if (t.element && t.element.parentNode) t.element.parentNode.removeChild(t.element);
                });
            }
        });

        socket.on('error-msg', (msg) => { alert("❌ " + msg); });
    }
}

function showMyIdentity(color) {
    const badge = document.getElementById('my-identity-badge');
    if (!badge) return;
    badge.classList.remove('hidden');
    let bgColor = (color === 'red') ? "#ff2a2a" : (color === 'green') ? "#00cc00" : (color === 'yellow') ? "#ffcc00" : "#1a53ff";
    badge.innerHTML = `👉 YOU ARE: (${color}) 👈`;
    badge.style.background = bgColor;
}

function createPrivateRoom(count) {
    connectToServer();
    socket.emit('create-room', { maxPlayers: count });
}

function joinPrivateRoom() {
    let id = document.getElementById("room-id-input").value.trim();
    if (id) {
        connectToServer();
        socket.emit('join-room', { roomId: id });
    } else alert("Enter the valid room id!");
}

// --- GAME INITIALIZATION ---
function initGameSession() {
    activePlayers.forEach(c => document.getElementById(`profile-${c}`).style.opacity = "1");
    activePlayers.forEach(c => missedTurns[c] = 0);
    currentPlayerIndex = 0;
    gameState = 'WAITING_FOR_ROLL';
    isMoving = false;
    updateTurnText();
    spawnTokens();
    startTurnTimer(); 
}

function startLocalGame(playerCount) {
    window.currentRoomId = ""; // No room ID = Offline Mode
    document.getElementById("startup-modal").classList.add("hidden");
    activePlayers = (playerCount === 2) ? ['red', 'yellow'] : (playerCount === 3) ? ['red', 'green', 'yellow'] : ['red', 'green', 'yellow', 'blue'];
    initGameSession();
}

function endMatchAndGoToMenu() {
    clearTurnTimer();
    setTimeout(() => {
        alert("🏆 MATCH FINISHED! 🏆");
        if (socket) socket.emit("leave-room");
        window.location.reload(); 
    }, 1500);
}

// --- ⏳ TIMER LOGIC (Server-safe) ---
function startTurnTimer() {
    clearTurnTimer(); 
    timeLeft = 25;
    updateTimerUI();

    countdownInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) clearInterval(countdownInterval);
    }, 1000);

    // Local kicks ONLY happen if offline
    if (!window.currentRoomId) {
        let currentColor = activePlayers[currentPlayerIndex];
        turnTimer = setTimeout(() => handleTurnTimeoutLocal(currentColor), 25000); 
    }
}

function clearTurnTimer() {
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

function updateTimerUI() {
    let timerEl = document.getElementById("timer-text");
    if (timerEl) timerEl.innerText = `⏳ Time left: ${timeLeft}s`;
}

function handleTurnTimeoutLocal(color) {
    missedTurns[color]++;
    if (missedTurns[color] >= 3) {
        alert(`🚨 ${color.toUpperCase()} missed 3 turns, eliminated from the game!`);
        activePlayers = activePlayers.filter(c => c !== color);
        if (activePlayers.length === 1) { endMatchAndGoToMenu(); return; }
        if (currentPlayerIndex >= activePlayers.length) currentPlayerIndex = 0;
        updateTurnText();
        gameState = 'WAITING_FOR_ROLL';
        startTurnTimer();
        return;
    }
    alert(`⚠️ ${color.toUpperCase()} skips turn.`);
    switchTurnLocal(false);
}

// --- BOARD CREATION ---
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
            if (isSafe) { cell.style.backgroundColor = "#e0e0e0"; cell.innerHTML = '<span class="safe-zone-icon">⭐</span>'; }
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

// 🚨 HYBRID DICE ROLL (Online = Server, Offline = Local)
function rollDice() {
    if (socket && window.currentRoomId) {
        if (myAssignedColor !== activePlayers[currentPlayerIndex]) {
            alert("Wait! This is not your turn."); return;
        }
    }
    if (activePlayers.length === 0 || gameState !== 'WAITING_FOR_ROLL' || isMoving) return;

    clearTurnTimer(); 
    const diceContainer = document.getElementById("dice-container");
    diceContainer.classList.add("rolling");

    if (socket && window.currentRoomId) {
        socket.emit('request-dice-roll', { roomId: window.currentRoomId });
    } else {
        // LOCAL OFFLINE MODE
        setTimeout(() => {
            diceContainer.classList.remove("rolling");
            currentDiceValue = Math.floor(Math.random() * 6) + 1; 
            diceContainer.innerText = diceFaces[currentDiceValue];
            diceContainer.style.color = currentDiceValue === 6 ? "#ff2a2a" : "#111";
            gameState = 'WAITING_FOR_MOVE';
            startTurnTimer(); 
            checkAvailableMoves();
        }, 500); 
    }
}

function handleRemoteDice(data) {
    currentDiceValue = data.diceValue;
    const diceContainer = document.getElementById("dice-container");
    diceContainer.classList.remove("rolling");
    diceContainer.innerText = diceFaces[currentDiceValue];
    diceContainer.style.color = currentDiceValue === 6 ? "#ff2a2a" : "#111";
    gameState = 'WAITING_FOR_MOVE';
    checkAvailableMoves();
}

function checkAvailableMoves() {
    let currentPlayerColor = activePlayers[currentPlayerIndex];
    let movableTokens = [];

    allTokens[currentPlayerColor].forEach((tokenObj, index) => {
        if (tokenObj.state === 'home' && currentDiceValue === 6) movableTokens.push(index); 
        else if (tokenObj.state === 'active' && tokenObj.pathPosition + currentDiceValue <= 56) movableTokens.push(index); 
    });

    if (movableTokens.length === 0) {
        if (!window.currentRoomId) setTimeout(() => switchTurnLocal(false), 500);
    } else {
        movableTokens.forEach(idx => allTokens[currentPlayerColor][idx].element.classList.add('highlight-move'));
    }
}

// 🚨 HYBRID TOKEN MOVE (Online = Server, Offline = Local)
function handleTokenClick(color, tokenIndex) {
    if (socket && window.currentRoomId && color !== myAssignedColor) return; 
    if (gameState !== 'WAITING_FOR_MOVE' || color !== activePlayers[currentPlayerIndex] || isMoving) return;

    let tokenObj = allTokens[color][tokenIndex];
    if (!tokenObj.element.classList.contains('highlight-move')) return; 

    allTokens[color].forEach(t => t.element.classList.remove('highlight-move'));

    if (socket && window.currentRoomId) {
        socket.emit('request-token-move', { roomId: window.currentRoomId, color: color, tokenIndex: tokenIndex });
    } else {
        // LOCAL OFFLINE MODE
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

function handleRemoteTokenMove(data) {
    let { color, tokenIndex, diceVal, cutDetails } = data;
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
                    }
                    if (tokenObj.pathPosition >= 56) tokenObj.element.style.display = "none"; 
                    isMoving = false; 
                }, 300);
            }
        }, 250); 
    }
}

// (For Local Mode Only)
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
