// Game State
let board = [];
let players = {
    red: { color: 'red', pawns: [-1, -1, -1, -1], homePath: [], hasWon: false },
    green: { color: 'green', pawns: [-1, -1, -1, -1], homePath: [], hasWon: false },
    yellow: { color: 'yellow', pawns: [-1, -1, -1, -1], homePath: [], hasWon: false },
    blue: { color: 'blue', pawns: [-1, -1, -1, -1], homePath: [], hasWon: false }
};
let turnOrder = ['red', 'green', 'yellow', 'blue'];
let currentTurnIndex = 0;
let currentTurn = 'red';
let diceValue = null;
let hasRolled = false;
let isMoving = false;
let myPlayerColor = null; // Set for Online Matches
let myPlayerName = "Player";
let currentRoomId = null;
let currentOnlineGameMode = 'classic'; // Default mode

// Full Board Track Configuration
const TOTAL_TRACK_CELLS = 52;
const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
const START_POSITIONS = { red: 0, green: 13, yellow: 26, blue: 39 };
const HOME_ENTRY_POINTS = { red: 50, green: 11, yellow: 24, blue: 37 };

// Coordinates on the 15x15 CSS Grid (1-indexed)
const trackCoordinates = [
    {r:7,c:2}, {r:7,c:3}, {r:7,c:4}, {r:7,c:5}, {r:7,c:6}, {r:6,c:7}, {r:5,c:7}, {r:4,c:7}, {r:3,c:7}, {r:2,c:7}, {r:1,c:7}, {r:1,c:8}, {r:1,c:9},
    {r:2,c:9}, {r:3,c:9}, {r:4,c:9}, {r:5,c:9}, {r:6,c:9}, {r:7,c:10}, {r:7,c:11}, {r:7,c:12}, {r:7,c:13}, {r:7,c:14}, {r:7,c:15}, {r:8,c:15}, {r:9,c:15},
    {r:9,c:14}, {r:9,c:13}, {r:9,c:12}, {r:9,c:11}, {r:9,c:10}, {r:10,c:9}, {r:11,c:9}, {r:12,c:9}, {r:13,c:9}, {r:14,c:9}, {r:15,c:9}, {r:15,c:8}, {r:15,c:7},
    {r:14,c:7}, {r:13,c:7}, {r:12,c:7}, {r:11,c:7}, {r:10,c:7}, {r:9,c:6}, {r:9,c:5}, {r:9,c:4}, {r:9,c:3}, {r:9,c:2}, {r:9,c:1}, {r:8,c:1}, {r:7,c:1}
];

const homeStraightCoordinates = {
    red:    [{r:8,c:2}, {r:8,c:3}, {r:8,c:4}, {r:8,c:5}, {r:8,c:6}],
    green:  [{r:2,c:8}, {r:3,c:8}, {r:4,c:8}, {r:5,c:8}, {r:6,c:8}],
    yellow: [{r:8,c:14}, {r:8,c:13}, {r:8,c:12}, {r:8,c:11}, {r:8,c:10}],
    blue:   [{r:14,c:8}, {r:13,c:8}, {r:12,c:8}, {r:11,c:8}, {r:10,c:8}]
};

const basePawnCoordinates = {
    red:    [{r:3,c:3}, {r:3,c:4}, {r:4,c:3}, {r:4,c:4}],
    green:  [{r:3,c:12}, {r:3,c:13}, {r:4,c:12}, {r:4,c:13}],
    yellow: [{r:12,c:12}, {r:12,c:13}, {r:13,c:12}, {r:13,c:13}],
    blue:   [{r:12,c:3}, {r:12,c:4}, {r:13,c:3}, {r:13,c:4}]
};

let socket = null;

// Lazy Connection: Only connects when user actively enters an Online match or creates/joins a room!
function ensureSocket() {
    if (!socket) {
        const socketUrl = (window.location.protocol.startsWith('http') && !window.location.href.includes('capacitor'))
            ? window.location.origin
            : 'https://competionludo.onrender.com';
        socket = io(socketUrl, { transports: ['websocket', 'polling'], timeout: 10000 });
        window.socket = socket;
        setupSocketListeners();
    }
    return socket;
}

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
});

function setOnlineGameMode(mode) {
    currentOnlineGameMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById(`mode-${mode}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    let desc = document.getElementById('mode-description');
    if (desc) {
        if (mode === 'classic') desc.innerText = "Classic: Traditional rules. Safe zones enabled. Move all 4 pawns home.";
        if (mode === 'quick') desc.innerText = "Quick: First player to get any 1 pawn home wins the game!";
        if (mode === 'master') desc.innerText = "Master: No safe points except base entry! Maximum captures and intense play.";
    }
}

// ----------------------------------------------------
// UI Screen Switchers & Online Matchmakers
// ----------------------------------------------------
function showCreateRoom() {
    document.getElementById('multiplayer-lobby').style.display = 'none';
    document.getElementById('create-room-panel').style.display = 'block';
}

function showJoinRoom() {
    document.getElementById('multiplayer-lobby').style.display = 'none';
    document.getElementById('join-room-panel').style.display = 'block';
}

function showQuickMatch() {
    document.getElementById('multiplayer-lobby').style.display = 'none';
    document.getElementById('quick-match-panel').style.display = 'block';
}

function backToLobby() {
    document.getElementById('create-room-panel').style.display = 'none';
    document.getElementById('join-room-panel').style.display = 'none';
    document.getElementById('quick-match-panel').style.display = 'none';
    document.getElementById('multiplayer-lobby').style.display = 'block';
}

function findOnlineMatch(playersCount) {
    const s = ensureSocket();
    document.getElementById('quick-match-display').innerText = `Searching for ${playersCount} players...`;
    s.emit('find-match', { playersRequired: playersCount, gameMode: currentOnlineGameMode });
}

function createPrivateRoom(playersCount) {
    const s = ensureSocket();
    s.emit('create-room', { maxPlayers: playersCount, gameMode: currentOnlineGameMode });
}

function joinPrivateRoom() {
    let roomId = document.getElementById('room-id-input').value.trim();
    if (roomId) {
        const s = ensureSocket();
        s.emit('join-room', { roomId: roomId });
    } else {
        showToast("Please enter a valid Room ID!");
    }
}

// ----------------------------------------------------
// Socket Listeners
// ----------------------------------------------------
function setupSocketListeners() {
    socket.on('room-created', (data) => {
        currentRoomId = data.roomId;
        myPlayerColor = data.color;
        document.getElementById('create-room-panel').style.display = 'none';
        document.getElementById('waiting-lobby').style.display = 'block';
        document.getElementById('display-room-id').innerText = data.roomId;
        document.getElementById('lobby-status').innerText = `Waiting for players... (1/${data.maxPlayers})`;
        if (data.gameMode) currentOnlineGameMode = data.gameMode;
    });

    socket.on('player-joined', (data) => {
        let lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerText = `Waiting for players... (${data.playersCount}/${data.maxPlayers})`;
        }
    });

    socket.on('match-found', (data) => {
        currentRoomId = data.roomId;
        myPlayerColor = data.color;
        if (data.gameMode) currentOnlineGameMode = data.gameMode;
        startGameWithPlayers(data.players, data.turnOrder, data.currentTurn);
    });

    socket.on('game-started', (data) => {
        if (!myPlayerColor) myPlayerColor = data.yourColor;
        if (data.gameMode) currentOnlineGameMode = data.gameMode;
        startGameWithPlayers(data.players, data.turnOrder, data.currentTurn);
    });

    socket.on('dice-rolled', (data) => {
        diceValue = data.value;
        animateDiceRoll(data.value);
        hasRolled = true;
        
        let diceValueDisplay = document.getElementById('dice-value-display');
        if (diceValueDisplay) diceValueDisplay.innerText = data.value;

        if (currentTurn === myPlayerColor) {
            evaluatePawnMoves();
        }
    });

    socket.on('pawn-moved', (data) => {
        movePawnVisual(data.color, data.pawnIndex, data.newPos, data.captured, data.nextTurn);
    });

    socket.on('turn-changed', (data) => {
        setTurn(data.currentTurn);
    });

    socket.on('player-disconnected', (data) => {
        showToast(`Player ${data.color.toUpperCase()} left the game.`);
    });

    socket.on('error-message', (data) => {
        showToast(data.message);
    });
}

// ----------------------------------------------------
// Game Initialization & Visual Rendering
// ----------------------------------------------------
function startGameWithPlayers(connectedPlayers, serverTurnOrder, initialTurn) {
    document.getElementById('multiplayer-lobby').style.display = 'none';
    document.getElementById('create-room-panel').style.display = 'none';
    document.getElementById('join-room-panel').style.display = 'none';
    document.getElementById('quick-match-panel').style.display = 'none';
    document.getElementById('waiting-lobby').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';

    turnOrder = serverTurnOrder;
    currentTurn = initialTurn;
    currentTurnIndex = turnOrder.indexOf(currentTurn);

    showToast(`Match Started! You are ${myPlayerColor.toUpperCase()}`);

    resetBoardData();
    renderPawns();
    updateUI();
}

function resetBoardData() {
    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        players[c].pawns = [-1, -1, -1, -1];
        players[c].homePath = [];
        players[c].hasWon = false;
    });
    hasRolled = false;
    isMoving = false;
}

function createBoard() {
    const boardElement = document.getElementById('ludo-board');
    if (!boardElement) return;
    boardElement.innerHTML = '';

    // Create Cells
    for (let r = 1; r <= 15; r++) {
        for (let c = 1; c <= 15; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.id = `cell-${r}-${c}`;
            boardElement.appendChild(cell);
        }
    }

    // Decorate Safe Cells & Stars
    SAFE_POSITIONS.forEach((posIndex) => {
        let coord = trackCoordinates[posIndex];
        let cell = document.getElementById(`cell-${coord.r}-${coord.c}`);
        if (cell) {
            cell.classList.add('safe-cell');
            cell.innerHTML = '<span class="star-icon">★</span>';
        }
    });

    renderPawns();
}

function renderPawns() {
    document.querySelectorAll('.pawn').forEach(el => el.remove());

    const boardElement = document.getElementById('ludo-board');

    turnOrder.forEach(color => {
        players[color].pawns.forEach((pos, pawnIndex) => {
            const pawn = document.createElement('div');
            pawn.classList.add('pawn', `pawn-${color}`);
            pawn.id = `pawn-${color}-${pawnIndex}`;
            pawn.dataset.color = color;
            pawn.dataset.index = pawnIndex;

            pawn.addEventListener('click', () => {
                handlePawnClick(color, pawnIndex);
            });

            boardElement.appendChild(pawn);
            positionPawnElement(pawn, color, pawnIndex, pos);
        });
    });
}

function positionPawnElement(pawnEl, color, index, pos) {
    let r, c;
    if (pos === -1) {
        // Inside Base
        let baseCoord = basePawnCoordinates[color][index];
        r = baseCoord.r;
        c = baseCoord.c;
    } else if (pos >= 0 && pos < 52) {
        // Track
        let trackCoord = trackCoordinates[pos];
        r = trackCoord.r;
        c = trackCoord.c;
    } else if (pos >= 100 && pos < 105) {
        // Home Path (100 = 1st step, 104 = 5th step)
        let step = pos - 100;
        let homeCoord = homeStraightCoordinates[color][step];
        r = homeCoord.r;
        c = homeCoord.c;
    } else if (pos === 105) {
        // Center Home
        r = 8;
        c = 8;
    }

    pawnEl.style.gridRowStart = r;
    pawnEl.style.gridColumnStart = c;
}

// ----------------------------------------------------
// Dice & Gameplay Mechanics
// ----------------------------------------------------
function rollDice() {
    if (currentTurn !== myPlayerColor) {
        showToast("Wait for your turn!");
        return;
    }
    if (hasRolled || isMoving) return;

    // Roll on server
    socket.emit('roll-dice', { roomId: currentRoomId });
}

function animateDiceRoll(finalValue) {
    const dice = document.getElementById('dice');
    if (!dice) return;

    dice.classList.add('rolling');
    let sound = document.getElementById('dice-sound');
    if (sound) sound.play().catch(() => {});

    setTimeout(() => {
        dice.classList.remove('rolling');
        dice.setAttribute('data-value', finalValue);
    }, 600);
}

function evaluatePawnMoves() {
    let movablePawns = [];

    players[myPlayerColor].pawns.forEach((pos, index) => {
        if (canPawnMove(myPlayerColor, pos, diceValue)) {
            movablePawns.push(index);
        }
    });

    if (movablePawns.length === 0) {
        // No moves possible -> Auto Pass Turn
        setTimeout(() => {
            socket.emit('end-turn', { roomId: currentRoomId });
            hasRolled = false;
        }, 1000);
    } else if (movablePawns.length === 1) {
        // Only one possible move -> Auto Move
        setTimeout(() => {
            selectPawnToMove(myPlayerColor, movablePawns[0]);
        }, 500);
    } else {
        // Highlight choices for player
        movablePawns.forEach(index => {
            let pawnEl = document.getElementById(`pawn-${myPlayerColor}-${index}`);
            if (pawnEl) pawnEl.classList.add('movable');
        });
    }
}

function canPawnMove(color, currentPos, roll) {
    if (currentPos === 105) return false; // Already finished
    if (currentPos === -1) {
        return roll === 6; // Requires 6 to release from base
    }

    if (currentPos >= 100) {
        return (currentPos + roll) <= 105;
    }

    let start = START_POSITIONS[color];
    let entry = HOME_ENTRY_POINTS[color];

    let distanceTraveled = (currentPos - start + 52) % 52;
    let distanceToEntry = (entry - start + 52) % 52;

    if (distanceTraveled + roll > distanceToEntry) {
        let homeSteps = (distanceTraveled + roll) - distanceToEntry - 1;
        return homeSteps <= 5;
    }

    return true;
}

function handlePawnClick(color, pawnIndex) {
    if (color !== myPlayerColor || currentTurn !== myPlayerColor) return;
    if (!hasRolled || isMoving) return;

    let pawnEl = document.getElementById(`pawn-${color}-${pawnIndex}`);
    if (pawnEl && pawnEl.classList.contains('movable')) {
        document.querySelectorAll('.pawn').forEach(p => p.classList.remove('movable'));
        selectPawnToMove(color, pawnIndex);
    }
}

function selectPawnToMove(color, pawnIndex) {
    isMoving = true;
    let currentPos = players[color].pawns[pawnIndex];
    let newPos = calculateNewPosition(color, currentPos, diceValue);

    socket.emit('move-pawn', {
        roomId: currentRoomId,
        color: color,
        pawnIndex: pawnIndex,
        newPos: newPos,
        diceValue: diceValue
    });
}

function calculateNewPosition(color, currentPos, roll) {
    if (currentPos === -1 && roll === 6) {
        return START_POSITIONS[color];
    }

    if (currentPos >= 100) {
        return currentPos + roll;
    }

    let start = START_POSITIONS[color];
    let entry = HOME_ENTRY_POINTS[color];

    let distanceTraveled = (currentPos - start + 52) % 52;
    let distanceToEntry = (entry - start + 52) % 52;

    if (distanceTraveled + roll > distanceToEntry) {
        let homeSteps = (distanceTraveled + roll) - distanceToEntry - 1;
        return 100 + homeSteps;
    }

    return (currentPos + roll) % 52;
}

function movePawnVisual(color, pawnIndex, newPos, capturedInfo, nextTurn) {
    isMoving = true;
    let pawnEl = document.getElementById(`pawn-${color}-${pawnIndex}`);
    players[color].pawns[pawnIndex] = newPos;

    if (pawnEl) {
        positionPawnElement(pawnEl, color, pawnIndex, newPos);
    }

    // Sound effect
    let moveSound = document.getElementById('step-sound');
    if (moveSound) moveSound.play().catch(() => {});

    // Check if capture occurred
    if (capturedInfo) {
        let capColor = capturedInfo.color;
        let capIndex = capturedInfo.pawnIndex;
        players[capColor].pawns[capIndex] = -1;
        let capPawnEl = document.getElementById(`pawn-${capColor}-${capIndex}`);
        if (capPawnEl) {
            positionPawnElement(capPawnEl, capColor, capIndex, -1);
            capPawnEl.classList.add('captured-animation');
            setTimeout(() => capPawnEl.classList.remove('captured-animation'), 600);
        }
        showToast(`${color.toUpperCase()} captured ${capColor.toUpperCase()}!`);
    }

    // Check Mode-based Win
    checkGameWinCondition(color);

    setTimeout(() => {
        isMoving = false;
        hasRolled = false;
        setTurn(nextTurn);
    }, 500);
}

function checkGameWinCondition(color) {
    if (currentOnlineGameMode === 'quick') {
        // Quick Mode: Any 1 pawn home wins!
        let hasAnyPawnWon = players[color].pawns.some(pos => pos === 105);
        if (hasAnyPawnWon) {
            showToast(`🏆 ${color.toUpperCase()} WINS THE QUICK MATCH! 🏆`);
        }
    } else {
        // Classic & Master: All 4 pawns home win!
        let allHome = players[color].pawns.every(pos => pos === 105);
        if (allHome) {
            showToast(`🏆 ${color.toUpperCase()} HAS WON THE GAME! 🏆`);
        }
    }
}

function setTurn(nextColor) {
    currentTurn = nextColor;
    currentTurnIndex = turnOrder.indexOf(currentTurn);
    updateUI();
}

function updateUI() {
    const turnIndicator = document.getElementById('turn-indicator');
    const rollButton = document.getElementById('roll-btn');

    if (turnIndicator) {
        turnIndicator.innerText = `${currentTurn.toUpperCase()}'s Turn`;
        turnIndicator.style.color = getHexForColor(currentTurn);
    }

    if (rollButton) {
        if (currentTurn === myPlayerColor && !hasRolled && !isMoving) {
            rollButton.disabled = false;
            rollButton.classList.add('active-roll');
        } else {
            rollButton.disabled = true;
            rollButton.classList.remove('active-roll');
        }
    }
}

function getHexForColor(color) {
    switch(color) {
        case 'red': return '#ef4444';
        case 'green': return '#22c55e';
        case 'yellow': return '#eab308';
        case 'blue': return '#3b82f6';
        default: return '#ffd700';
    }
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.className = 'show';
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 2800);
}
