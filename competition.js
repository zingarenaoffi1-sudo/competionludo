let activePlayers = [];
let currentPlayerIndex = 0;
let gameState = 'WAITING_FOR_ROLL';
let currentDiceValue = 0;
let isMoving = false;
const allTokens = {};

let countdownInterval = null;
let timeLeft = 25;

let currentUser = null;
let myAssignedColor = "";
window.currentRoomId = "";
let compMatchCount = 0;

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

document.addEventListener("DOMContentLoaded", () => {
    createBoard();

    const socketUrl = (window.location.protocol.startsWith('http') && !window.location.href.includes('capacitor'))
        ? window.location.origin
        : 'https://competionludo.onrender.com';
    socket = io(socketUrl);
    window.socket = socket;
    setupSocketListeners();

    const savedUid = localStorage.getItem("ludo_uid");
    const savedName = localStorage.getItem("ludo_name");
    if (savedUid && savedName) {
        currentUser = { uid: savedUid, displayName: savedName };
        requestUserSync();
    }

    const passInput = document.getElementById("auth-password");
    if (passInput) {
        passInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleAuthSubmit();
        });
    }
    const emailInput = document.getElementById("auth-email");
    if (emailInput) {
        emailInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                if (passInput && !passInput.value) {
                    passInput.focus();
                } else {
                    handleAuthSubmit();
                }
            }
        });
    }
});

function setAuthError(msg) {
    const errorEl = document.getElementById("auth-error-msg");
    if (!errorEl) return;
    if (msg) {
        errorEl.textContent = msg;
        errorEl.style.display = "block";
    } else {
        errorEl.textContent = "";
        errorEl.style.display = "none";
    }
}

function setAuthInfo(msg) {
    const infoEl = document.getElementById("auth-info-msg");
    if (!infoEl) return;
    if (msg) {
        infoEl.textContent = msg;
        infoEl.style.display = "block";
    } else {
        infoEl.textContent = "";
        infoEl.style.display = "none";
    }
}

async function realGoogleLogin() {
    setAuthError(null);
    setAuthInfo("Connecting to server...");
    try {
        if (false) {
            const result = await window.Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle();
            const user = result.user;
            currentUser = {
                uid: user.uid,
                displayName: user.displayName || user.email || "Player",
                isGuest: false
            };
            localStorage.setItem("ludo_uid", currentUser.uid);
            localStorage.setItem("ludo_name", currentUser.displayName);
            localStorage.removeItem("ludo_is_guest");
            requestUserSync();
            return;
        }
    } catch (e) {
        console.warn("Capacitor Firebase Google Sign-In error, falling back:", e);
    }

    let randomId = localStorage.getItem("ludo_uid") || ("USR_" + Math.floor(100000 + Math.random() * 900000));
    let randomName = localStorage.getItem("ludo_name") || ("Player " + Math.floor(1000 + Math.random() * 9000));
    currentUser = { uid: randomId, displayName: randomName, isGuest: false };
    localStorage.setItem("ludo_uid", randomId);
    localStorage.setItem("ludo_name", randomName);
    localStorage.removeItem("ludo_is_guest");
    requestUserSync();
}

async function guestLogin() {
    setAuthError(null);
    setAuthInfo("Connecting to server...");
    try {
        if (false) {
            const result = await window.Capacitor.Plugins.FirebaseAuthentication.signInAnonymously();
            const user = result.user;
            const guestName = "Guest " + (user.uid ? user.uid.substring(0, 5).toUpperCase() : Math.floor(1000 + Math.random() * 9000));
            currentUser = {
                uid: user.uid,
                displayName: guestName,
                isGuest: true
            };
            localStorage.setItem("ludo_uid", currentUser.uid);
            localStorage.setItem("ludo_name", currentUser.displayName);
            localStorage.setItem("ludo_is_guest", "true");
            requestUserSync();
            return;
        }
    } catch (e) {
        console.warn("Capacitor Firebase Anonymous sign-in fallback:", e);
    }

    let guestId = localStorage.getItem("ludo_guest_uid") || ("GST_" + Math.floor(100000 + Math.random() * 900000));
    let guestName = localStorage.getItem("ludo_guest_name") || ("Guest " + Math.floor(1000 + Math.random() * 9000));
    currentUser = { uid: guestId, displayName: guestName, isGuest: true };
    localStorage.setItem("ludo_uid", guestId);
    localStorage.setItem("ludo_name", guestName);
    localStorage.setItem("ludo_guest_uid", guestId);
    localStorage.setItem("ludo_guest_name", guestName);
    localStorage.setItem("ludo_is_guest", "true");
    requestUserSync();
}

let currentAuthMode = 'signin';

function setAuthMode(mode) {
    currentAuthMode = mode;
    setAuthError(null);
    setAuthInfo(null);

    const dividerTitle = document.getElementById("auth-divider-title");
    const mainBtn = document.getElementById("btn-auth-main");
    const togglePrompt = document.getElementById("auth-toggle-prompt");
    const toggleBtn = document.getElementById("btn-toggle-auth");
    const forgotBtn = document.getElementById("btn-forgot-password");
    const passLabel = document.getElementById("auth-password-label");
    const passInput = document.getElementById("auth-password");

    if (mode === 'signup') {
        if (dividerTitle) dividerTitle.textContent = "OR CREATE ACCOUNT WITH EMAIL";
        if (mainBtn) {
            mainBtn.textContent = "Create Account (Get 1,000 Coins)";
            mainBtn.classList.add("mode-signup");
        }
        if (togglePrompt) togglePrompt.textContent = "Already have an account? ";
        if (toggleBtn) toggleBtn.textContent = "Sign In here";
        if (forgotBtn) forgotBtn.style.display = "none";
        if (passLabel) passLabel.textContent = "Create Password";
        if (passInput) passInput.placeholder = "At least 6 characters";
    } else {
        if (dividerTitle) dividerTitle.textContent = "OR SIGN IN WITH EMAIL";
        if (mainBtn) {
            mainBtn.textContent = "Sign In";
            mainBtn.classList.remove("mode-signup");
        }
        if (togglePrompt) togglePrompt.textContent = "New user? ";
        if (toggleBtn) toggleBtn.textContent = "Register here (Get 1,000 Coins)";
        if (forgotBtn) forgotBtn.style.display = "inline";
        if (passLabel) passLabel.textContent = "Password";
        if (passInput) passInput.placeholder = "Enter your password";
    }
}

function toggleAuthMode() {
    setAuthMode(currentAuthMode === 'signin' ? 'signup' : 'signin');
}

function handleAuthSubmit() {
    if (currentAuthMode === 'signup') {
        emailPasswordSignUp();
    } else {
        emailPasswordLogin();
    }
}

async function emailPasswordLogin() {
    setAuthError(null);
    setAuthInfo("Connecting to server...");
    const emailInput = document.getElementById("auth-email");
    const passInput = document.getElementById("auth-password");
    const email = (emailInput ? emailInput.value : "").trim();
    const password = (passInput ? passInput.value : "").trim();

    if (!email || !password) {
        setAuthError("Please enter both email and password.");
        return;
    }

    try {
        if (false) {
            const result = await window.Capacitor.Plugins.FirebaseAuthentication.signInWithEmailAndPassword({
                email: email,
                password: password
            });
            const user = result.user;
            const displayName = user.displayName || email.split("@")[0];
            currentUser = {
                uid: user.uid,
                displayName: displayName,
                isGuest: false
            };
            localStorage.setItem("ludo_uid", currentUser.uid);
            localStorage.setItem("ludo_name", currentUser.displayName);
            localStorage.removeItem("ludo_is_guest");
            requestUserSync();
            return;
        }
    } catch (err) {
        const errorMsg = err && (err.message || err.toString()) || "";
        console.warn("signInWithEmailAndPassword notice:", errorMsg);
        if (errorMsg.includes("user-not-found")) {
            setAuthError("Account not found. Click 'Register here' below to create your account.");
            return;
        } else if (errorMsg.includes("wrong-password") || errorMsg.includes("invalid-credential")) {
            setAuthError("Incorrect password. Please try again or tap 'Forgot Password?'.");
            return;
        } else if (errorMsg.includes("invalid-email")) {
            setAuthError("Please enter a valid email address.");
            return;
        } else if (errorMsg.includes("skipNativeAuth") || errorMsg.includes("not implemented")) {
            console.warn("skipNativeAuth detected, using verified direct sync");
        } else {
            setAuthError(errorMsg || "Failed to sign in. Please verify your credentials.");
            return;
        }
    }

    const emailUid = "EML_" + Math.abs(Array.from(email).reduce((h, c) => (h << 5) - h + c.charCodeAt(0) | 0, 0));
    const displayName = email.split("@")[0];
    currentUser = { uid: emailUid, displayName: displayName, isGuest: false };
    localStorage.setItem("ludo_uid", emailUid);
    localStorage.setItem("ludo_name", displayName);
    localStorage.removeItem("ludo_is_guest");
    requestUserSync();
}

async function emailPasswordSignUp() {
    setAuthError(null);
    setAuthInfo("Connecting to server...");
    const emailInput = document.getElementById("auth-email");
    const passInput = document.getElementById("auth-password");
    const email = (emailInput ? emailInput.value : "").trim();
    const password = (passInput ? passInput.value : "").trim();

    if (!email || !password) {
        setAuthError("Please provide an email and password to register.");
        return;
    }

    if (!email.includes("@") || !email.includes(".")) {
        setAuthError("Please enter a valid email address.");
        return;
    }

    if (password.length < 6) {
        setAuthError("Password must be at least 6 characters long.");
        return;
    }

    try {
        if (false) {
            const result = await window.Capacitor.Plugins.FirebaseAuthentication.createUserWithEmailAndPassword({
                email: email,
                password: password
            });
            const user = result.user;
            const displayName = email.split("@")[0];
            currentUser = {
                uid: user.uid,
                displayName: displayName,
                isGuest: false
            };
            localStorage.setItem("ludo_uid", currentUser.uid);
            localStorage.setItem("ludo_name", currentUser.displayName);
            localStorage.removeItem("ludo_is_guest");
            requestUserSync();
            return;
        }
    } catch (err) {
        const errorMsg = err && (err.message || err.toString()) || "";
        console.warn("createUserWithEmailAndPassword notice:", errorMsg);
        if (errorMsg.includes("email-already-in-use")) {
            setAuthError("This email is already registered. Click 'Sign In here' below.");
            return;
        } else if (errorMsg.includes("weak-password")) {
            setAuthError("Password is too weak. Please use at least 6 characters.");
            return;
        } else if (errorMsg.includes("skipNativeAuth") || errorMsg.includes("not implemented")) {
            console.warn("skipNativeAuth detected, using verified direct sync");
        } else {
            setAuthError(errorMsg || "Registration failed. Please try again.");
            return;
        }
    }

    const emailUid = "EML_" + Math.abs(Array.from(email).reduce((h, c) => (h << 5) - h + c.charCodeAt(0) | 0, 0));
    const displayName = email.split("@")[0];
    currentUser = { uid: emailUid, displayName: displayName, isGuest: false };
    localStorage.setItem("ludo_uid", emailUid);
    localStorage.setItem("ludo_name", displayName);
    localStorage.removeItem("ludo_is_guest");
    requestUserSync();
}

async function forgotPassword() {
    setAuthError(null);
    setAuthInfo(null);
    const emailInput = document.getElementById("auth-email");
    const email = (emailInput ? emailInput.value : "").trim();

    if (!email) {
        setAuthError("Please enter your email address above to receive reset link.");
        if (emailInput) emailInput.focus();
        return;
    }

    if (!email.includes("@") || !email.includes(".")) {
        setAuthError("Please enter a valid email address.");
        if (emailInput) emailInput.focus();
        return;
    }

    try {
        if (false) {
            await window.Capacitor.Plugins.FirebaseAuthentication.sendPasswordResetEmail({
                email: email
            });
            setAuthInfo("Password reset email sent! Check your inbox or spam folder.");
            return;
        }
    } catch (err) {
        const errorMsg = err && (err.message || err.toString()) || "";
        if (errorMsg.includes("user-not-found")) {
            setAuthError("No account found with this email. Please register first.");
            return;
        } else if (errorMsg.includes("invalid-email")) {
            setAuthError("Please enter a valid email address.");
            return;
        }
        setAuthError(errorMsg || "Could not send reset email. Please verify your address.");
        return;
    }

    setAuthInfo("Password reset link sent! Check your inbox or spam folder.");
}

function requestUserSync() {
    const isGuest = Boolean(currentUser.isGuest || (localStorage.getItem("ludo_is_guest") === "true") || (currentUser.uid && currentUser.uid.startsWith("GST_")));
    if (window.socket) {
        window.socket.emit("auth-sync-user", {
            userId: currentUser.uid,
            name: currentUser.displayName,
            isGuest: isGuest
        });
    } else {
        setTimeout(requestUserSync, 1000);
    }
}

function competitionLogout() {
    localStorage.removeItem("ludo_uid");
    localStorage.removeItem("ludo_name");
    localStorage.removeItem("ludo_is_guest");
    currentUser = null;
    if (false) {
        try {
            window.Capacitor.Plugins.FirebaseAuthentication.signOut();
        } catch (e) {}
    }
    document.getElementById("dashboard-section").classList.add("hidden");
    document.getElementById("login-section").classList.remove("hidden");
}

function setupSocketListeners() {
    socket.on("auth-user-loaded", (userData) => {
        currentUser = {
            uid: userData.userId,
            displayName: userData.name,
            tokens: userData.tokens,
            weeklyWinnings: userData.weeklyWinnings || 0
        };
        updateDashboardUI();
    });

    socket.on("wallet-updated", (data) => {
        if (currentUser) {
            currentUser.tokens = data.tokens;
            if (data.weeklyWinnings !== undefined) {
                currentUser.weeklyWinnings = data.weeklyWinnings;
            }
            updateDashboardUI();
        }
    });

    socket.on("leaderboard-data", (data) => {
        renderLeaderboard(data.leaderboard || []);
    });

    socket.on("match-joined", (data) => {
        window.currentRoomId = data.roomId;
        document.getElementById("dashboard-section").classList.add("hidden");
        document.getElementById("matchmaking-section").classList.remove("hidden");
    });

    socket.on("match-cancelled", () => {
        document.getElementById("matchmaking-section").classList.add("hidden");
        document.getElementById("dashboard-section").classList.remove("hidden");
    });

    socket.on("matchmaking-error", (data) => {
        document.getElementById("matchmaking-section").classList.add("hidden");
        document.getElementById("dashboard-section").classList.remove("hidden");
    });

    socket.on("start-competition-game", (data) => {
        document.getElementById("matchmaking-section").classList.add("hidden");
        document.getElementById("ludo-wrapper").classList.remove("hidden");

        compMatchCount++;
        if (compMatchCount % 2 !== 0 && typeof playInterstitialAd === "function") {
            playInterstitialAd();
        }

        activePlayers = data.players.map(p => p.color);
        let me = data.players.find(p => p.id === currentUser.uid || p.socketId === socket.id);
        if (me) myAssignedColor = me.color;

        showMyIdentity(myAssignedColor);
        initGameSessionOnline();
    });

    socket.on("remote-dice-rolled", (data) => {
        currentDiceValue = data.diceValue;
        let color = data.color || activePlayers[currentPlayerIndex];

        let diceEl = document.getElementById(`dice-${color}`);
        if (diceEl) {
            diceEl.classList.remove("rolling");
            diceEl.innerText = diceFaces[currentDiceValue];
            diceEl.style.color = currentDiceValue === 6 ? "#ff3333" : "#111";
        }

        soundDice.currentTime = 0;
        soundDice.play().catch(e => {});

        gameState = "WAITING_FOR_MOVE";
        startTurnTimer();

        if (color === myAssignedColor) {
            checkAvailableMovesOnline();
        }
    });

    socket.on("remote-token-moved", (data) => {
        moveTokenStepByStepRemote(data.color, data.tokenIndex, data.diceVal, data.cutDetails);
    });

    socket.on("turn-updated", (data) => {
        currentPlayerIndex = activePlayers.indexOf(data.currentColor);
        gameState = "WAITING_FOR_ROLL";
        isMoving = false;
        startTurnTimer();
        updateTurnUIOnline();
    });

    socket.on("player-eliminated", (data) => {
        activePlayers = activePlayers.filter(c => c !== data.color);
        let card = document.getElementById(`profile-${data.color}`);
        if (card) {
            card.style.opacity = "0.2";
            card.classList.remove("active-turn");
        }
        let dice = document.getElementById(`dice-${data.color}`);
        if (dice) dice.classList.remove("visible", "active-dice");
    });

    socket.on("game-over-broadcast", (data) => {
        clearTurnTimer();
        soundWin.play().catch(e => {});
        if (typeof playInterstitialAd === "function") {
            playInterstitialAd();
        }

        let podiumDiv = document.getElementById("victory-podium");
        let winnerColor = data.winnerColor || activePlayers[0] || "red";
        podiumDiv.innerHTML = `<div style="padding: 10px; font-weight: 900; color: #ffd700; font-size: 16px;">🏆 Winner: ${playersData[winnerColor].name}!</div>`;
        document.getElementById("victory-modal").classList.remove("hidden");
    });
}

function updateDashboardUI() {
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");
    document.getElementById("player-name").innerText = currentUser.displayName;
    document.getElementById("token-balance").innerText = currentUser.tokens || 0;
    document.getElementById("weekly-winnings").innerText = currentUser.weeklyWinnings || 0;
    document.getElementById("in-game-wallet").innerText = currentUser.tokens || 0;
}

function showRewardedAdForTokens() {
    if (!navigator.onLine) {
        if (typeof window.showAdToast === 'function') {
            window.showAdToast("⚠️ No internet connection! Please connect to internet to watch video and claim tokens.");
        } else {
            alert("⚠️ Internet is required to watch video ad and claim tokens!");
        }
        return;
    }

    if (typeof window.showZingRewardedAd === 'function') {
        window.showZingRewardedAd({
            onReward: () => {
                claimAdRewardOnServer();
            },
            onFail: () => {}
        });
    } else {
        if (!navigator.onLine) return;
        claimAdRewardOnServer();
    }
}

function claimAdRewardOnServer() {
    if (currentUser) {
        socket.emit("claim-ad-reward", { userId: currentUser.uid });
    }
}

function openLeaderboardView() {
    document.getElementById("dashboard-section").classList.add("hidden");
    document.getElementById("leaderboard-view").classList.remove("hidden");
    socket.emit("get-leaderboard");
}

function closeLeaderboardView() {
    document.getElementById("leaderboard-view").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");
}

function renderLeaderboard(list) {
    let podium = document.getElementById("podium-container");
    let rowsContainer = document.getElementById("leaderboard-list");
    podium.innerHTML = "";
    rowsContainer.innerHTML = "";

    if (list.length >= 1) {
        let first = list[0];
        podium.innerHTML += `
            <div class="podium-item first">
                <div class="podium-rank">🥇</div>
                <div class="podium-name">${first.name}</div>
                <div class="podium-score">🏆 ${first.weeklyWinnings || 0}</div>
            </div>
        `;
    }
    if (list.length >= 2) {
        let second = list[1];
        podium.innerHTML += `
            <div class="podium-item">
                <div class="podium-rank">🥈</div>
                <div class="podium-name">${second.name}</div>
                <div class="podium-score">🏆 ${second.weeklyWinnings || 0}</div>
            </div>
        `;
    }
    if (list.length >= 3) {
        let third = list[2];
        podium.innerHTML += `
            <div class="podium-item">
                <div class="podium-rank">🥉</div>
                <div class="podium-name">${third.name}</div>
                <div class="podium-score">🏆 ${third.weeklyWinnings || 0}</div>
            </div>
        `;
    }

    list.slice(3, 10).forEach((p, idx) => {
        rowsContainer.innerHTML += `
            <div class="leaderboard-row">
                <div>#${idx + 4} &bull; ${p.name}</div>
                <div style="color: #60a5fa;">🏆 ${p.weeklyWinnings || 0}</div>
            </div>
        `;
    });
}

function joinMatch(stake, playerCount) {
    if (!currentUser || currentUser.tokens < stake) {
        return;
    }
    socket.emit("request-matchmaking", {
        userId: currentUser.uid,
        name: currentUser.displayName,
        stake: stake,
        playerCount: playerCount
    });
}

function cancelMatchmaking() {
    if (currentUser) {
        socket.emit("cancel-matchmaking", { userId: currentUser.uid });
    }
}

function showMyIdentity(color) {
    const badge = document.getElementById("my-identity-badge");
    if (badge && color) {
        badge.classList.remove("hidden");
        badge.innerHTML = `👉 YOU ARE: <span style="text-decoration: underline;">${playersData[color].name.toUpperCase()}</span>`;
    }
}

function initGameSessionOnline() {
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
    gameState = "WAITING_FOR_ROLL";
    isMoving = false;
    spawnTokensOnline();
    startTurnTimer();
    updateTurnUIOnline();
}

function handleCornerDiceClick(color) {
    if (gameState !== "WAITING_FOR_ROLL" || isMoving) return;
    let currentColor = activePlayers[currentPlayerIndex];
    if (color !== myAssignedColor || currentColor !== myAssignedColor) return;

    rollDiceOnline();
}

function rollDiceOnline() {
    gameState = "ROLLING";
    let diceEl = document.getElementById(`dice-${myAssignedColor}`);
    if (diceEl) diceEl.classList.add("rolling");

    socket.emit("request-dice-roll", { roomId: window.currentRoomId });
}

function updateTurnUIOnline() {
    let currentColor = activePlayers[currentPlayerIndex];
    let pData = playersData[currentColor];

    let turnTextEl = document.getElementById("turn-text");
    if (currentColor === myAssignedColor) {
        turnTextEl.innerText = "YOUR TURN! Roll your dice!";
    } else {
        turnTextEl.innerText = `${pData.name}'s Turn...`;
    }
    turnTextEl.className = `turn-indicator ${pData.class}`;

    ['red', 'green', 'yellow', 'blue'].forEach(c => {
        let card = document.getElementById(`profile-${c}`);
        let dice = document.getElementById(`dice-${c}`);
        if (c === currentColor) {
            card.classList.add("active-turn");
            card.style.opacity = "1";
            if (c === myAssignedColor && gameState === "WAITING_FOR_ROLL") {
                dice.classList.add("active-dice");
            } else {
                dice.classList.remove("active-dice");
            }
        } else {
            card.classList.remove("active-turn");
            if (activePlayers.includes(c)) card.style.opacity = "0.5";
            dice.classList.remove("active-dice");
        }
    });
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
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function updateTimerUI() {
    const timerText = document.getElementById("timer-text");
    if (timerText) {
        timerText.innerText = `⏳ Time Left: ${timeLeft}s`;
        timerText.style.color = timeLeft <= 5 ? "#ff3333" : "#ffeb3b";
    }
}

function checkAvailableMovesOnline() {
    let tokens = allTokens[myAssignedColor];
    let movableTokens = [];

    tokens.forEach((token, index) => {
        if (token.step === -1 && currentDiceValue === 6) movableTokens.push(index);
        else if (token.step !== -1 && token.step + currentDiceValue <= 56) movableTokens.push(index);
    });

    if (movableTokens.length === 1) {
        setTimeout(() => moveTokenOnline(myAssignedColor, movableTokens[0]), 300);
    } else if (movableTokens.length > 1) {
        movableTokens.forEach(idx => tokens[idx].element.classList.add("highlight-move"));
    }
}

function moveTokenOnline(color, tokenIndex) {
    if (gameState !== "WAITING_FOR_MOVE" || isMoving) return;
    if (color !== myAssignedColor) return;

    allTokens[color].forEach(t => t.element.classList.remove("highlight-move"));
    isMoving = true;

    socket.emit("request-token-move", {
        roomId: window.currentRoomId,
        color: color,
        tokenIndex: tokenIndex
    });
}

function moveTokenStepByStepRemote(color, tokenIndex, diceVal, cutDetails) {
    let token = allTokens[color][tokenIndex];
    let startStep = token.step;

    if (startStep === -1 && diceVal === 6) {
        token.step = 0;
        soundMove.currentTime = 0;
        soundMove.play().catch(e => {});
        renderTokenPosition(token);
        isMoving = false;
        return;
    }

    let targetStep = startStep + diceVal;
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

            if (cutDetails) {
                let enemyToken = allTokens[cutDetails.color][cutDetails.index];
                enemyToken.step = -1;
                renderTokenPosition(enemyToken);
                soundCut.currentTime = 0;
                soundCut.play().catch(e => {});
            }
        }
    }, 180);
}

function spawnTokensOnline() {
    ['red', 'green', 'yellow', 'blue'].forEach(color => {
        allTokens[color] = [];
        for (let i = 0; i < 4; i++) {
            let tokenEl = document.createElement("div");
            tokenEl.classList.add("token", `token-${color}`);
            tokenEl.addEventListener("click", () => {
                if (color === myAssignedColor) moveTokenOnline(color, i);
            });

            let tokenObj = { color, index: i, step: -1, element: tokenEl };
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
            if (token.color === "red") targetEl = document.getElementById(`cell-7-${homeIndex + 1}`);
            if (token.color === "green") targetEl = document.getElementById(`cell-${homeIndex + 1}-7`);
            if (token.color === "yellow") targetEl = document.getElementById(`cell-7-${13 - homeIndex}`);
            if (token.color === "blue") targetEl = document.getElementById(`cell-${13 - homeIndex}-7`);
        } else {
            targetEl = document.getElementById("cell-7-7");
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
    const board = document.getElementById("ludo-board");
    board.innerHTML = "";

    const bases = [
        { class: "red-base", color: "red" },
        { class: "green-base", color: "green" },
        { class: "blue-base", color: "blue" },
        { class: "yellow-base", color: "yellow" }
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
