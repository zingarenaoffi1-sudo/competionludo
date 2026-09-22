let activePlayers = [];
let currentPlayerIndex = 0;
let gameState = 'WAITING_FOR_ROLL';
let currentDiceValue = 0;
let isMoving = false;
const allTokens = {};
let countdownInterval = null;
let timeLeft = 30;
let myAssignedColor = "";
let currentOnlineRoomId = "";
let currentOnlineGameMode = 'classic';
let isRoomHost = false;
let currentRoomData = null;
let quickMatchAdCounter = parseInt(localStorage.getItem('quickMatchAdCounter') || '0', 10);

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
let socket = null;

function ensureSocket() {
    if (!socket) {
        const socketUrl = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) 
            ? 'https://competionludo.onrender.com' 
            : window.location.origin;
        socket = io(socketUrl, { transports: ['websocket', 'polling'], timeout: 10000 });
        window.socket = socket;
        setupSocketListeners();
    }
    return socket;
}

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
    ensureSocket();
});

function getMyPlayerName() {
    const savedName = localStorage.getItem("ludo_name");
    return savedName ? savedName.trim().slice(0, 15) : "Player";
}

function showToast(msg) {
    let toast = document.getElementById("toast-msg");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-msg";
        toast.className = "toast-message";
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function setOnlineGameMode(mode) {
    currentOnlineGameMode = mode;
    ['classic', 'quick', 'team'].forEach(m => {
        const el = document.getElementById(`online-mode-${m}`);
        if (el) {
            const isActive = (m === 'team' ? mode === 'team2v2' : mode === m);
            el.style.border = isActive ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.15)';
        }
    });
}

function showQuickMatch() {
    document.getElementById('online-main-options').classList.add('hidden');
    document.getElementById('quick-match-sub').classList.remove('hidden');
    document.getElementById('create-room-sub').classList.add('hidden');
    document.getElementById('join-room-sub').classList.add('hidden');
    document.getElementById('matchmaking-sub').classList.add('hidden');
    document.getElementById('custom-room-lobby').classList.add('hidden');
}

function showCreateRoomOptions() {
    document.getElementById('online-main-options').classList.add('hidden');
    document.getElementById('create-room-sub').classList.remove('hidden');
    document.getElementById('quick-match-sub').classList.add('hidden');
    document.getElementById('join-room-sub').classList.add('hidden');
    document.getElementById('matchmaking-sub').classList.add('hidden');
    document.getElementById('custom-room-lobby').classList.add('hidden');
}

function showJoinRoomInput() {
    document.getElementById('online-main-options').classList.add('hidden');
    document.getElementById('join-room-sub').classList.remove('hidden');
    document.getElementById('quick-match-sub').classList.add('hidden');
    document.getElementById('create-room-sub').classList.add('hidden');
    document.getElementById('matchmaking-sub').classList.add('hidden');
    document.getElementById('custom-room-lobby').classList.add('hidden');
}

function backToOnlineMain() {
    document.getElementById('online-main-options').classList.remove('hidden');
    document.getElementById('quick-match-sub').classList.add('hidden');
    document.getElementById('create-room-sub').classList.add('hidden');
    document.getElementById('join-room-sub').classList.add('hidden');
    document.getElementById('matchmaking-sub').classList.add('hidden');
    document.getElementById('custom-room-lobby').classList.add('hidden');
}

async function findOnlineMatch(playersCount) {
    // Alternate ad schedule: 1st click shows ad, 2nd skipped, 3rd shows ad, 4th skipped, etc.
    const shouldShowAd = (quickMatchAdCounter % 2 === 0);
    quickMatchAdCounter++;
    localStorage.setItem('quickMatchAdCounter', String(quickMatchAdCounter));

    const statusEl = document.getElementById('quick-match-display');
    if (statusEl) statusEl.innerText = shouldShowAd ? "Loading ad..." : "Connecting...";

    if (shouldShowAd && typeof playInterstitialAd === 'function') {
        await playInterstitialAd();
    }

    document.getElementById('quick-match-sub').classList.add('hidden');
    document.getElementById('matchmaking-sub').classList.remove('hidden');

    const matchText = document.getElementById('matchmaking-status-text');
    if (matchText) {
        matchText.innerText = `Searching for ${playersCount} Players (${currentOnlineGameMode.toUpperCase()})...`;
    }

    const s = ensureSocket();
    s.emit('find-match', {
        playersRequired: playersCount,
        gameMode: currentOnlineGameMode,
        playerName: getMyPlayerName()
    });
}

function cancelOnlineMatchmaking() {
    if (socket) {
        socket.emit('cancel-match');
    }
    backToOnlineMain();
}

async function createPrivateRoom(playersCount) {
    const statusEl = document.getElementById('room-created-display');
    if (statusEl) statusEl.innerText = "Creating private room...";

    if (typeof playInterstitialAd === 'function') {
        await playInterstitialAd();
    }

    const s = ensureSocket();
    s.emit('create-room', {
        maxPlayers: playersCount,
        gameMode: currentOnlineGameMode,
        playerName: getMyPlayerName()
    });
}

function joinPrivateRoom() {
    const input = document.getElementById('room-id-input');
    const roomId = input ? input.value.trim().toUpperCase() : '';
    if (!roomId) {
        showToast("Please enter a valid Room ID!");
        return;
    }
    const s = ensureSocket();
    s.emit('join-room', {
        roomId: roomId,
        playerName: getMyPlayerName()
    });
}

function copyCustomRoomId() {
    if (!currentOnlineRoomId) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentOnlineRoomId).then(() => {
            showToast("Room ID copied to clipboard!");
        }).catch(() => {
            showToast(currentOnlineRoomId);
        });
    } else {
        showToast(currentOnlineRoomId);
    }
}

function startCustomRoomMatch() {
    if (!isRoomHost || !currentOnlineRoomId) return;
    const s = ensureSocket();
    s.emit('start-custom-room', { roomId: currentOnlineRoomId });
}

function leaveCustomRoom() {
    if (socket && currentOnlineRoomId) {
        socket.emit('leave-custom-room', { roomId: currentOnlineRoomId });
    }
    currentOnlineRoomId = "";
    window.currentOnlineRoomId = "";
    backToOnlineMain();
}

function renderCustomRoomLobby(data) {
    currentRoomData = data;
    currentOnlineRoomId = data.roomId;
    window.currentOnlineRoomId = data.roomId;

    document.getElementById('online-main-options').classList.add('hidden');
    document.getElementById('quick-match-sub').classList.add('hidden');
    document.getElementById('create-room-sub').classList.add('hidden');
    document.getElementById('join-room-sub').classList.add('hidden');
    document.getElementById('matchmaking-sub').classList.add('hidden');
    document.getElementById('custom-room-lobby').classList.remove('hidden');

    const idEl = document.getElementById('custom-room-id-display');
    if (idEl) idEl.innerText = data.roomId;

    const modeTag = document.getElementById('custom-room-mode-tag');
    if (modeTag) modeTag.innerText = `${(data.gameMode || 'classic').toUpperCase()} ROOM`;

    const slotsTag = document.getElementById('custom-room-slots-tag');
    if (slotsTag) slotsTag.innerText = `${data.players.length} / ${data.maxPlayers} Players`;

    const hostActions = document.getElementById('custom-room-host-actions');
    const guestStatus = document.getElementById('custom-room-guest-status');
    const startBtn = document.getElementById('btn-start-custom-match');

    if (isRoomHost) {
        if (hostActions) hostActions.classList.remove('hidden');
        if (guestStatus) guestStatus.classList.add('hidden');
        if (startBtn) {
            if (data.players.length >= 2) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.innerText = '🚀 Start Match';
            } else {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.innerText = '⏳ Waiting for 1 more player...';
            }
        }
    } else {
        if (hostActions) hostActions.classList.add('hidden');
        if (guestStatus) guestStatus.classList.remove('hidden');
    }

    const listEl = document.getElementById('custom-room-players-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const colors = ['red', 'green', 'yellow', 'blue'];
    for (let i = 0; i < data.maxPlayers; i++) {
        const slotColor = colors[i];
        const p = data.players[i];
        const slotDiv = document.createElement('div');
        slotDiv.style.display = 'flex';
        slotDiv.style.alignItems = 'center';
        slotDiv.style.justifyContent = 'space-between';
        slotDiv.style.background = 'rgba(30, 41, 59, 0.7)';
        slotDiv.style.border = p ? `1.5px solid ${getColorHex(slotColor)}` : '1px dashed rgba(255,255,255,0.15)';
        slotDiv.style.borderRadius = '10px';
        slotDiv.style.padding = '8px 12px';

        if (p) {
            const isMe = (p.id === socket.id);
            slotDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: ${getColorHex(slotColor)}; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; font-size: 12px;">
                        ${i + 1}
                    </div>
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 13px;">${p.name || ('Player ' + (i + 1))} ${isMe ? '<span style="color:#ffd700;">(You)</span>' : ''}</div>
                        <div style="font-size: 11px; color: ${getColorHex(slotColor)}; font-weight: 700;">${slotColor.toUpperCase()}</div>
                    </div>
                </div>
                <span style="font-size: 11px; font-weight: 800; background: ${p.isHost ? 'rgba(255,215,0,0.2)' : 'rgba(34,197,94,0.2)'}; color: ${p.isHost ? '#ffd700' : '#4ade80'}; padding: 3px 8px; border-radius: 6px;">
                    ${p.isHost ? 'HOST' : 'READY'}
                </span>
            `;
        } else {
            slotDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; opacity: 0.5;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #94a3b8; font-size: 12px;">
                        ${i + 1}
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; font-weight: 600;">Waiting for player...</div>
                </div>
                <span style="font-size: 11px; color: #64748b; font-weight: 600;">EMPTY</span>
            `;
        }
        listEl.appendChild(slotDiv);
    }
}

function getColorHex(color) {
    switch (color) {
        case 'red': return '#ef4444';
        case 'green': return '#22c55e';
        case 'yellow': return '#eab308';
        case 'blue': return '#3b82f6';
        default: return '#cbd5e1';
    }
}

let onlineTurnChanceCount = 0;

function setupSocketListeners() {
    socket.on('room-created', (data) => {
        isRoomHost = true;
        myAssignedColor = data.color;
        window.myColor = myAssignedColor;
        renderCustomRoomLobby(data);
    });

    socket.on('joined-success', (data) => {
        isRoomHost = false;
        myAssignedColor = data.color;
        window.myColor = myAssignedColor;
        renderCustomRoomLobby(data);
    });

    socket.on('room-players-updated', (data) => {
        if (currentRoomData && currentRoomData.roomId === data.roomId) {
            currentRoomData.players = data.players;
            currentRoomData.maxPlayers = data.maxPlayers;
            renderCustomRoomLobby(currentRoomData);
        }
    });

    socket.on('room-closed', (data) => {
        showToast(data.message || 'Room was closed.');
        currentOnlineRoomId = "";
        window.currentOnlineRoomId = "";
        backToOnlineMain();
    });

    socket.on('room-error', (data) => {
        const modal = document.getElementById('room-error-modal');
        const text = document.getElementById('room-error-text');
        if (text) text.innerText = data.message || 'Room error occurred.';
        if (modal) modal.classList.remove('hidden');
    });

    socket.on('match-found', (data) => {
        currentOnlineRoomId = data.roomId;
        window.currentOnlineRoomId = data.roomId;
        myAssignedColor = data.color;
        window.myColor = myAssignedColor;
    });

    socket.on('start-online-game', (data) => {
        onlineTurnChanceCount = 0;
        const modal = document.getElementById('online-modal');
        if (modal) modal.classList.add('hidden');

        const hud = document.getElementById('online-hud-bar');
        if (hud) hud.style.display = 'flex';

        currentOnlineRoomId = data.roomId;
        window.currentOnlineRoomId = data.roomId;
        if (data.gameMode) currentOnlineGameMode = data.gameMode;

        activePlayers = data.players.map(p => p.color);
        window.activePlayers = activePlayers;

        const me = data.players.find(p => p.id === socket.id);
        if (me) {
            myAssignedColor = me.color;
            window.myColor = myAssignedColor;
        }

        showMyIdentity(myAssignedColor);
        initGameSessionOnline();
    });

    socket.on('remote-dice-rolled', (data) => {
        currentDiceValue = data.diceValue;
        const color = data.color || activePlayers[currentPlayerIndex];
        const diceEl = document.getElementById(`dice-${color}`);
        if (diceEl) {
            diceEl.classList.remove('rolling');
            diceEl.innerText = diceFaces[currentDiceValue];
            diceEl.style.color = currentDiceValue === 6 ? '#ff3333' : '#111';
        }
        soundDice.currentTime = 0;
        soundDice.play().catch(() => {});
        gameState = 'WAITING_FOR_MOVE';
        startTurnTimer();
        if (color === myAssignedColor) {
            checkAvailableMovesOnline();
        }
    });

    socket.on('remote-token-moved', (data) => {
        moveTokenStepByStepRemote(data.color, data.tokenIndex, data.diceVal, data.cutDetails);
    });

    socket.on('turn-updated', (data) => {
        currentPlayerIndex = activePlayers.indexOf(data.currentColor);
        gameState = 'WAITING_FOR_ROLL';
        isMoving = false;
        if (data.missedTurns) {
            updateStrikesUI(data.missedTurns);
        }
        if (data.skippedColor) {
            const pName = playersData[data.skippedColor]?.name || data.skippedColor.toUpperCase();
            if (data.skippedColor === myAssignedColor) {
                showToast(`⚠️ You missed your turn! (${data.skippedCount}/3 Skips)`);
            } else {
                showToast(`⏳ ${pName} missed their turn (${data.skippedCount}/3 Skips)`);
            }
        }
        startTurnTimer();
        updateTurnUIOnline();

        if (data.currentColor === myAssignedColor && navigator.onLine) {
            onlineTurnChanceCount++;
            // 1st chance: ad, 2nd chance: no ad, 3rd chance: ad, 4th chance: no ad...
            if (onlineTurnChanceCount % 2 !== 0) {
                if (typeof playInterstitialAd === 'function') {
                    playInterstitialAd();
                }
            }
        }
    });

    socket.on('player-eliminated', (data) => {
        activePlayers = activePlayers.filter(c => c !== data.color);
        window.activePlayers = activePlayers;

        // 1. Hide all tokens of this player from board completely
        if (allTokens[data.color]) {
            allTokens[data.color].forEach(t => {
                if (t.element) {
                    t.element.style.display = 'none';
                    t.element.classList.remove('highlight-move');
                }
            });
        }

        // 2. Mark player card as LEFT
        const card = document.getElementById(`profile-${data.color}`);
        if (card) {
            card.classList.add('player-left');
            card.classList.remove('active-turn');
            const statusTag = card.querySelector('.player-status-tag');
            if (statusTag) {
                statusTag.innerHTML = `<span class="player-left-tag">LEFT</span>`;
            }
            const strikesContainer = document.getElementById(`strikes-${data.color}`);
            if (strikesContainer) {
                strikesContainer.innerHTML = `<span class="player-left-tag">LEFT</span>`;
            }
        }

        // 3. Hide their corner dice
        const dice = document.getElementById(`dice-${data.color}`);
        if (dice) {
            dice.classList.remove('visible', 'active-dice', 'rolling');
            dice.style.display = 'none';
        }

        const pName = playersData[data.color]?.name || data.color.toUpperCase();
        showToast(`🚫 ${pName} was removed from match (Left / 3 Skips).`);
    });

    socket.on('game-over-broadcast', (data) => {
        clearTurnTimer();
        gameState = 'GAME_OVER';
        soundWin.currentTime = 0;
        soundWin.play().catch(() => {});

        const podiumDiv = document.getElementById('victory-podium');
        const winnerColor = data.winnerColor || activePlayers[0] || 'red';
        const winnerName = data.winnerName || playersData[winnerColor]?.name || winnerColor.toUpperCase();
        if (podiumDiv) {
            if (data.reason === 'opponent_left') {
                podiumDiv.innerHTML = `<div style="padding: 10px; font-weight: 900; color: #ffd700; font-size: 18px;">🏆 Winner: ${winnerName}!<div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">(Opponent Left / Disqualified)</div></div>`;
            } else {
                podiumDiv.innerHTML = `<div style="padding: 10px; font-weight: 900; color: #ffd700; font-size: 18px;">🏆 Winner: ${winnerName}!</div>`;
            }
        }
        const victoryModal = document.getElementById('victory-modal');
        if (victoryModal) victoryModal.classList.remove('hidden');

        if (typeof playInterstitialAd === 'function') {
            playInterstitialAd();
        }
    });
}

function showMyIdentity(color) {
    const badge = document.getElementById('my-identity-badge');
    if (badge && color && playersData[color]) {
        badge.classList.remove('hidden');
        badge.innerHTML = `👉 YOU ARE: <span style="text-decoration: underline;">${playersData[color].name.toUpperCase()}</span>`;
    }
}

function initGameSessionOnline() {
    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        const card = document.getElementById(`profile-${c}`);
        const dice = document.getElementById(`dice-${c}`);
        const strikesContainer = document.getElementById(`strikes-${c}`);
        
        if (card) {
            card.classList.remove('player-left', 'active-turn');
            const statusTag = card.querySelector('.player-status-tag');
            if (statusTag) {
                statusTag.innerText = playersData[c]?.name || c.toUpperCase();
            }
        }
        if (dice) {
            dice.style.display = '';
            dice.classList.remove('active-dice', 'rolling');
        }
        if (strikesContainer) {
            strikesContainer.innerHTML = `
                <span class="strike-dot" id="dot-${c}-1"></span>
                <span class="strike-dot" id="dot-${c}-2"></span>
                <span class="strike-dot" id="dot-${c}-3"></span>
                <span class="player-strikes-text" id="strike-txt-${c}">0/3</span>
            `;
        }

        if (activePlayers.includes(c)) {
            if (card) card.style.opacity = '0.5';
            if (dice) {
                dice.classList.add('visible');
                dice.innerText = '🎲';
            }
        } else {
            if (card) card.style.opacity = '0.15';
            if (dice) dice.classList.remove('visible');
        }
    });
    currentPlayerIndex = 0;
    gameState = 'WAITING_FOR_ROLL';
    isMoving = false;
    spawnTokensOnline();
    startTurnTimer();
    updateTurnUIOnline();
}

function updateStrikesUI(missedTurns) {
    if (!missedTurns) return;
    ['red', 'green', 'yellow', 'blue'].forEach(color => {
        const count = missedTurns[color] || 0;
        const txtEl = document.getElementById(`strike-txt-${color}`);
        if (txtEl) {
            txtEl.innerText = `${Math.min(count, 3)}/3`;
        }
        for (let i = 1; i <= 3; i++) {
            const dot = document.getElementById(`dot-${color}-${i}`);
            if (dot) {
                if (i <= count) {
                    dot.classList.add('missed');
                } else {
                    dot.classList.remove('missed');
                }
            }
        }
    });
}

function handleCornerDiceClick(color) {
    if (gameState !== 'WAITING_FOR_ROLL' || isMoving) return;
    const currentColor = activePlayers[currentPlayerIndex];
    if (color !== myAssignedColor || currentColor !== myAssignedColor) return;
    rollDiceOnline();
}

function rollDiceOnline() {
    gameState = 'ROLLING';
    const diceEl = document.getElementById(`dice-${myAssignedColor}`);
    if (diceEl) diceEl.classList.add('rolling');
    socket.emit('request-dice-roll', { roomId: currentOnlineRoomId });
}

function updateTurnUIOnline() {
    const currentColor = activePlayers[currentPlayerIndex];
    if (!currentColor || !playersData[currentColor]) return;
    const pData = playersData[currentColor];
    const turnTextEl = document.getElementById('turn-text');
    if (turnTextEl) {
        if (currentColor === myAssignedColor) {
            turnTextEl.innerText = "YOUR TURN! Roll your dice!";
        } else {
            turnTextEl.innerText = `${pData.name}'s Turn...`;
        }
        turnTextEl.className = `turn-indicator ${pData.class}`;
    }
    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        const card = document.getElementById(`profile-${c}`);
        const dice = document.getElementById(`dice-${c}`);
        if (c === currentColor) {
            if (card) {
                card.classList.add('active-turn');
                card.style.opacity = '1';
            }
            if (dice) {
                if (c === myAssignedColor && gameState === 'WAITING_FOR_ROLL') {
                    dice.classList.add('active-dice');
                } else {
                    dice.classList.remove('active-dice');
                }
            }
        } else {
            if (card) {
                card.classList.remove('active-turn');
                if (activePlayers.includes(c)) card.style.opacity = '0.5';
            }
            if (dice) dice.classList.remove('active-dice');
        }
    });
}

function startTurnTimer() {
    clearTurnTimer();
    timeLeft = 30;
    updateTimerUI();
    countdownInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) {
            clearTurnTimer();
        }
    }, 1000);
}

function clearTurnTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function updateTimerUI() {
    const timerText = document.getElementById('timer-text');
    if (timerText) {
        timerText.innerText = `⏳ Time Left: ${timeLeft}s`;
        timerText.style.color = timeLeft <= 5 ? '#ff3333' : '#ffeb3b';
    }
}

function checkAvailableMovesOnline() {
    const tokens = allTokens[myAssignedColor];
    if (!tokens) return;
    const movableTokens = [];
    tokens.forEach((token, index) => {
        if (token.step === -1 && currentDiceValue === 6) movableTokens.push(index);
        else if (token.step !== -1 && token.step + currentDiceValue <= 56) movableTokens.push(index);
    });
    if (movableTokens.length === 1) {
        setTimeout(() => moveTokenOnline(myAssignedColor, movableTokens[0]), 300);
    } else if (movableTokens.length > 1) {
        movableTokens.forEach(idx => tokens[idx].element.classList.add('highlight-move'));
    }
}

function moveTokenOnline(color, tokenIndex) {
    if (gameState !== 'WAITING_FOR_MOVE' || isMoving) return;
    if (color !== myAssignedColor) return;
    allTokens[color].forEach(t => t.element.classList.remove('highlight-move'));
    isMoving = true;
    socket.emit('request-token-move', {
        roomId: currentOnlineRoomId,
        color: color,
        tokenIndex: tokenIndex
    });
}

function moveTokenStepByStepRemote(color, tokenIndex, diceVal, cutDetails) {
    const token = allTokens[color][tokenIndex];
    const startStep = token.step;
    if (startStep === -1 && diceVal === 6) {
        token.step = 0;
        soundMove.currentTime = 0;
        soundMove.play().catch(() => {});
        renderTokenPosition(token);
        isMoving = false;
        return;
    }
    const targetStep = startStep + diceVal;
    let currentStep = startStep;
    const moveInterval = setInterval(() => {
        currentStep++;
        token.step = currentStep;
        renderTokenPosition(token);
        soundMove.currentTime = 0;
        soundMove.play().catch(() => {});
        if (currentStep >= targetStep) {
            clearInterval(moveInterval);
            isMoving = false;
            if (cutDetails) {
                const enemyToken = allTokens[cutDetails.color][cutDetails.index];
                enemyToken.step = -1;
                renderTokenPosition(enemyToken);
                soundCut.currentTime = 0;
                soundCut.play().catch(() => {});
            }
        }
    }, 180);
}

function spawnTokensOnline() {
    const board = document.getElementById('ludo-board');
    if (board) {
        board.querySelectorAll('.token').forEach(el => el.remove());
    }
    ['red', 'green', 'yellow', 'blue'].forEach(color => {
        allTokens[color] = [];
        for (let i = 0; i < 4; i++) {
            const tokenEl = document.createElement('div');
            tokenEl.classList.add('token', `token-${color}`);
            tokenEl.addEventListener('click', () => {
                if (color === myAssignedColor) moveTokenOnline(color, i);
            });
            const tokenObj = { color, index: i, step: -1, element: tokenEl };
            allTokens[color].push(tokenObj);
            if (board) {
                board.appendChild(tokenEl);
            }
            if (!activePlayers.includes(color)) {
                tokenEl.style.display = 'none';
            }
            renderTokenPosition(tokenObj);
        }
    });
}

function renderTokenPosition(token) {
    const board = document.getElementById('ludo-board');
    if (!board || !token || !token.element) return;
    const boardRect = board.getBoundingClientRect();
    let targetEl = null;
    if (token.step === -1) {
        targetEl = document.getElementById(`slot-${token.color}-${token.index}`);
    } else if (token.step <= 51) {
        const globalIndex = (playersData[token.color].startOffset + token.step) % 52;
        const coords = masterPath[globalIndex];
        targetEl = document.getElementById(`cell-${coords.r}-${coords.c}`);
    } else {
        const homeIndex = token.step - 52;
        if (homeIndex < 5) {
            if (token.color === 'red') targetEl = document.getElementById(`cell-7-${homeIndex + 1}`);
            if (token.color === 'green') targetEl = document.getElementById(`cell-${homeIndex + 1}-7`);
            if (token.color === 'yellow') targetEl = document.getElementById(`cell-7-${13 - homeIndex}`);
            if (token.color === 'blue') targetEl = document.getElementById(`cell-${13 - homeIndex}-7`);
        } else {
            targetEl = document.getElementById('cell-7-7');
        }
    }
    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
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
    const board = document.getElementById('ludo-board');
    if (!board) return;
    board.innerHTML = '';
    const bases = [
        { class: 'red-base', color: 'red' },
        { class: 'green-base', color: 'green' },
        { class: 'blue-base', color: 'blue' },
        { class: 'yellow-base', color: 'yellow' }
    ];
    bases.forEach(b => {
        const baseEl = document.createElement('div');
        baseEl.classList.add('base', b.class);
        const inner = document.createElement('div');
        inner.classList.add('inner-base');
        for (let i = 0; i < 4; i++) {
            const slot = document.createElement('div');
            slot.classList.add('token-slot');
            slot.id = `slot-${b.color}-${i}`;
            inner.appendChild(slot);
        }
        baseEl.appendChild(inner);
        board.appendChild(baseEl);
    });
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8)) continue;
            const cell = document.createElement('div');
            cell.classList.add('ludo-cell');
            cell.id = `cell-${r}-${c}`;
            cell.style.gridArea = `${r + 1} / ${c + 1} / ${r + 2} / ${c + 2}`;
            if (r === 7 && c > 0 && c < 6) cell.style.backgroundColor = 'var(--red-main)';
            if (c === 7 && r > 0 && r < 6) cell.style.backgroundColor = 'var(--green-main)';
            if (r === 7 && c > 8 && c < 14) cell.style.backgroundColor = 'var(--yellow-main)';
            if (c === 7 && r > 8 && r < 14) cell.style.backgroundColor = 'var(--blue-main)';
            if (r === 6 && c === 1) cell.style.backgroundColor = 'var(--red-main)';
            if (r === 1 && c === 8) cell.style.backgroundColor = 'var(--green-main)';
            if (r === 8 && c === 13) cell.style.backgroundColor = 'var(--yellow-main)';
            if (r === 13 && c === 6) cell.style.backgroundColor = 'var(--blue-main)';
            safeZones.forEach(z => {
                if (z.r === r && z.c === c) {
                    const star = document.createElement('span');
                    star.classList.add('safe-zone-icon');
                    star.innerText = '⭐';
                    cell.appendChild(star);
                }
            });
            board.appendChild(cell);
        }
    }
}
