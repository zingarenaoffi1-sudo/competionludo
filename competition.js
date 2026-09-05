let myTokens = 0;
let myWeeklyWinnings = 0;
let socket;

let activePlayers = [];
let currentPlayerIndex = 0;
let gameState = 'WAITING_FOR_ROLL';
let currentDiceValue = 0;
let isMoving = false;
const allTokens = {};
let myAssignedColor = "";
window.currentRoomId = "";

let countdownInterval = null;
let timeLeft = 25;

const soundDice = new Audio('sounds/board game dice_2.mp3');
const soundMove = new Audio('sounds/ui pop_2.mp3');
const soundCut = new Audio('sounds/cartoon bonk.mp3');
const soundWin = new Audio('sounds/success chime_2.mp3');
const soundAd = new Audio('sounds/coin collect game_2.mp3');

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

let lastAdTime = 0;
function triggerInterstitialAd(reason) {
    let now = Date.now();
    if (now - lastAdTime < 15000) return Promise.resolve();
    lastAdTime = now;
    if (typeof window.showAd === 'function') {
        return Promise.resolve(window.showAd());
    }
    return Promise.resolve();
}

async function initAdMobRewards() {
    if (window.Capacitor && Capacitor.Plugins.AdMob) {
        const { AdMob } = Capacitor.Plugins;
        try {
            await AdMob.initialize({ initializeForTesting: true });
            
            AdMob.addListener('onRewardedVideoAdReward', () => {
                if (socket) socket.emit('claim-ad-reward');
                soundAd.play().catch(e => {});
                alert("Reward processed! Adding tokens to your wallet via server! 🪙");
            });

            AdMob.addListener('onRewardedVideoAdDismissed', () => {
                console.log("Ad closed by user.");
            });

            AdMob.addListener('onRewardedVideoAdFailedToLoad', (err) => {
                console.error("Ad failed to load: ", err);
            });
            
        } catch(e) {
            console.error("AdMob Init Error: ", e);
        }
    }
}

async function showRewardedAdForTokens() {
    if (!socket) { alert("Please log in first!"); return; }
    if (window.Capacitor && Capacitor.Plugins.AdMob) {
        const { AdMob } = Capacitor.Plugins;
        try {
            await AdMob.prepareRewardVideoAd({
                adId: 'ca-app-pub-3940256099942544/5224354917',
                isTesting: true
            });
            await AdMob.showRewardVideoAd();
        } catch(e) {
            alert("The ad is still loading or failed to load. Please try again in a moment.");
        }
    } else {
        alert("[PC TEST MODE] Ad simulated. Requesting 100 tokens from server...");
        setTimeout(() => { if (socket) socket.emit('claim-ad-reward'); }, 2000);
    }
}

function updateWalletUI() {
    let tokenEl = document.getElementById('token-balance');
    let winEl = document.getElementById('weekly-winnings');
    if (tokenEl) tokenEl.innerText = myTokens;
    if (winEl) winEl.innerText = myWeeklyWinnings;
}

document.addEventListener("DOMContentLoaded", () => {
    createBoard();
    let diceBtn = document.getElementById("dice-container");
    if(diceBtn) diceBtn.addEventListener("click", rollDice);
});

async function realGoogleLogin() {
    try {
        let idToken;
        let user;

        if (window.Capacitor && Capacitor.Plugins.FirebaseAuthentication) {
            const { FirebaseAuthentication } = Capacitor.Plugins;
            const result = await FirebaseAuthentication.signInWithGoogle({
                clientId: "554089835021-3idmc196ket8k4buadpj7d7oobq1ka4f.apps.googleusercontent.com"
            });
            user = result.user;
            const tokenResponse = await FirebaseAuthentication.getIdToken();
            idToken = tokenResponse.token || result.user.idToken;
        } else {
            user = { uid: "pc_test_" + Math.floor(Math.random()*1000), displayName: "Zing PC Player" };
            idToken = "PC_TEST_TOKEN";
        }

        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('player-name').innerText = user.displayName || "Zing Master";

        socket = io('https://competionludo.onrender.com');
        socket.emit('authenticate-user', { idToken: idToken });

        socket.on('update-wallet', (data) => {
            myTokens = data.tokens;
            myWeeklyWinnings = data.score;
            updateWalletUI();
        });

        socket.on('error-msg', (msg) => { alert("❌ " + msg); });
        socket.on('leaderboard-data', renderLeaderboard);

        socket.on('start-online-game', (data) => {
            if (data.mode === 'comp') {
                document.getElementById("dashboard-section").classList.add("hidden");
                document.getElementById("matchmaking-section").classList.add("hidden");
                document.getElementById("ludo-wrapper").classList.remove("hidden");

                window.currentRoomId = data.roomId;
                activePlayers = data.players.map(p => p.color);
                
                let me = data.players.find(p => p.id === socket.id);
                if (me) {
                    myAssignedColor = me.color;
                    showMyIdentity(me.color);
                }
                initGameSession();
            }
        });

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
        
        socket.on('game-over-broadcast', (data) => {
            if (data.winnerId === socket.id) {
                soundWin.play().catch(e => {});
            }
            alert(data.winnerId === socket.id ? `🎉 Congratulations! You won ${data.prize} Tokens!` : `😔 You lost this match.`);
            endMatchAndGoToMenu();
        });

        initAdMobRewards();

    } catch (error) {
        alert("Google sign-in failed. Error: " + (error.message || JSON.stringify(error)));
    }
}

async function joinMatch(entryFee, playersRequired) {
    if (!socket) { alert("Please log in first!"); return; }
    if (myTokens >= entryFee) {
        document.getElementById('dashboard-section').classList.add('hidden');
        document.getElementById('matchmaking-section').classList.remove('hidden');
        
        await triggerInterstitialAd("Entering Pro Match");
        socket.emit('find-comp-match', { entryFee: entryFee, playersRequired: playersRequired });
    } else {
        alert("Not enough tokens to join this match!");
    }
}

function cancelMatchmaking() {
    if (socket) {
        socket.emit('cancel-action');
    }
    document.getElementById('matchmaking-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
}

function showLeaderboard() {
    if (socket) socket.emit('get-leaderboard');
}

function renderLeaderboard(data) {
    const container = document.getElementById('leaderboard-list');
    const modal = document.getElementById('leaderboard-modal');
    if (!container || !modal) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa;">No winnings recorded yet.</p>';
    } else {
        const medals = ['🥇', '🥈', '🥉'];
        container.innerHTML = data.map((p, i) => {
            const rankLabel = medals[i] || `#${i + 1}`;
            return `<div class="leaderboard-row"><span>${rankLabel} ${p.name}</span><span>🏆 ${p.weeklyWinnings}</span></div>`;
        }).join('');
    }
    modal.classList.remove('hidden');
}

function closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.classList.add('hidden');
}

function initGameSession() {
    activePlayers.forEach(c => {
        let p = document.getElementById(`profile-${c}`);
        if(p) p.style.opacity = "1";
    });
    currentPlayerIndex = 0;
    gameState = 'WAITING_FOR_ROLL';
    isMoving = false;
    updateTurnText();
    spawnTokens();
    startTurnTimer();
}

function endMatchAndGoToMenu() {
    clearTurnTimer();
    triggerInterstitialAd("Match Finished");
    setTimeout(() => {
        if (socket) socket.emit("leave-room");
        let wrapper = document.getElementById("ludo-wrapper");
        let dashboard = document.getElementById("dashboard-section");
        if(wrapper) wrapper.classList.add("hidden");
        if(dashboard) dashboard.classList.remove("hidden");
    }, 1500);
}

function createBoard() {
    const board = document.getElementById("ludo-board");
    if(!board) return;
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
                cell.innerHTML = '<span class="safe-zone-icon">⭐</span>';
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
    if (socket && window.currentRoomId) {
        if (myAssignedColor !== activePlayers[currentPlayerIndex]) {
            alert("Wait! It is not your turn."); return;
        }
    }
    if (activePlayers.length === 0 || gameState !== 'WAITING_FOR_ROLL' || isMoving) return;

    const diceContainer = document.getElementById("dice-container");
    diceContainer.classList.add("rolling");

    if (socket && window.currentRoomId) {
        socket.emit('request-dice-roll', { roomId: window.currentRoomId });
    }
}

function handleRemoteDice(data) {
    currentDiceValue = data.diceValue;
    
    soundDice.currentTime = 0;
    soundDice.play().catch(e => {});

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

    if (movableTokens.length > 0) {
        movableTokens.forEach(idx => allTokens[currentPlayerColor][idx].element.classList.add('highlight-move'));
        if (movableTokens.length === 1 && currentPlayerColor === myAssignedColor) {
            setTimeout(() => handleTokenClick(currentPlayerColor, movableTokens[0]), 300);
        }
    }
}

function handleTokenClick(color, tokenIndex) {
    if (socket && window.currentRoomId && color !== myAssignedColor) return;
    if (gameState !== 'WAITING_FOR_MOVE' || color !== activePlayers[currentPlayerIndex] || isMoving) return;

    let tokenObj = allTokens[color][tokenIndex];
    if (!tokenObj.element.classList.contains('highlight-move')) return;

    allTokens[color].forEach(t => t.element.classList.remove('highlight-move'));

    if (socket && window.currentRoomId) {
        socket.emit('request-token-move', {
            roomId: window.currentRoomId,
            color: color,
            tokenIndex: tokenIndex
        });
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
                        
                        soundCut.play().catch(e => {});
                    }
                    if (tokenObj.pathPosition >= 56) {
                        tokenObj.element.style.display = "none";
                        if(color === myAssignedColor) socket.emit("claim-victory", { roomId: window.currentRoomId });
                    }
                    isMoving = false;
                }, 300);
            }
        }, 250);
    }
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

function updateTurnText() {
    let currentPlayerColor = activePlayers[currentPlayerIndex];
    const turnText = document.getElementById("turn-text");
    if(turnText) {
        turnText.innerText = playersData[currentPlayerColor].name;
        turnText.className = playersData[currentPlayerColor].class;
    }
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
}

function clearTurnTimer() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

function updateTimerUI() {
    let timerEl = document.getElementById("timer-text");
    if (timerEl) timerEl.innerText = `⏳ Time left: ${timeLeft}s`;
}

function showMyIdentity(color) {
    const badge = document.getElementById('my-identity-badge');
    if (!badge) return;
    badge.classList.remove('hidden');
    let playerNum = (color === 'red') ? "Player 1" : (color === 'green') ? "Player 2" : "Player 3";
    let bgColor = (color === 'red') ? "#ff2a2a" : (color === 'green') ? "#00cc00" : "#ffcc00";
    badge.innerHTML = `👉 YOU ARE: ${playerNum} (${color.toUpperCase()}) 👈`;
    badge.style.background = bgColor;
}
