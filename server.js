const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');
const crypto = require('crypto');

function secureDiceRoll() {
    // Cryptographically secure pseudorandom number generator (CSPRNG)
    // Uses hardware/OS entropy via Node.js native OpenSSL implementation (C++)
    return crypto.randomInt(1, 7);
}

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'ZingArena SECURE Server is Awake and Running!' });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("🔥 Firebase Admin SDK Initialized Successfully!");
    } else {
        console.warn("⚠️ WARNING: FIREBASE_SERVICE_ACCOUNT is missing — operating with in-memory database mock!");
    }
} catch (e) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT JSON error!", e.message);
}

class MemoryDocRef {
    constructor(collection, id) {
        this.collection = collection;
        this.id = id;
    }
    async get() {
        const item = this.collection.store.get(this.id);
        return {
            exists: !!item,
            data: () => (item ? JSON.parse(JSON.stringify(item)) : undefined),
            ref: this
        };
    }
    async set(data) {
        const copy = JSON.parse(JSON.stringify(data));
        this.collection.store.set(this.id, copy);
        return copy;
    }
    async update(patch) {
        let existing = this.collection.store.get(this.id) || {};
        for (const [k, v] of Object.entries(patch)) {
            if (v && typeof v === 'object' && v._isIncrement !== undefined) {
                existing[k] = (Number(existing[k]) || 0) + Number(v._isIncrement);
            } else if (v && typeof v.toDate === 'function') {
                existing[k] = v;
            } else {
                existing[k] = v;
            }
        }
        this.collection.store.set(this.id, existing);
        return existing;
    }
}

class MemoryCollection {
    constructor() {
        this.store = new Map();
    }
    doc(id) {
        return new MemoryDocRef(this, id);
    }
    orderBy(field, direction = 'asc') {
        return {
            limit: (n) => ({
                get: async () => {
                    const docs = [];
                    for (const [id, val] of this.store.entries()) {
                        docs.push({
                            id,
                            ref: new MemoryDocRef(this, id),
                            data: () => JSON.parse(JSON.stringify(val))
                        });
                    }
                    docs.sort((a, b) => {
                        const valA = Number(a.data()[field]) || 0;
                        const valB = Number(b.data()[field]) || 0;
                        return direction === 'desc' ? valB - valA : valA - valB;
                    });
                    const sliced = docs.slice(0, n);
                    return {
                        empty: sliced.length === 0,
                        docs: sliced
                    };
                }
            })
        };
    }
    where(field, op, val) {
        return {
            get: async () => {
                const docs = [];
                for (const [id, data] of this.store.entries()) {
                    const itemVal = data[field];
                    let match = false;
                    if (op === '>') match = itemVal > val;
                    else if (op === '>=') match = itemVal >= val;
                    else if (op === '==') match = itemVal === val;
                    else if (op === '<') match = itemVal < val;
                    else if (op === '<=') match = itemVal <= val;
                    if (match) {
                        docs.push({
                            id,
                            ref: new MemoryDocRef(this, id),
                            data: () => JSON.parse(JSON.stringify(data))
                        });
                    }
                }
                return {
                    empty: docs.length === 0,
                    docs
                };
            }
        };
    }
}

function createMockDb() {
    const collections = new Map();
    const getCol = (name) => {
        if (!collections.has(name)) collections.set(name, new MemoryCollection());
        return collections.get(name);
    };

    const usersCol = getCol('users');
    const seedPlayers = [
        { name: 'Vikram Aditya', mainWallet: 25000, weeklyWinnings: 48000 },
        { name: 'Priya Sharma', mainWallet: 18000, weeklyWinnings: 39500 },
        { name: 'Amit Verma', mainWallet: 14000, weeklyWinnings: 31000 },
        { name: 'Rohan Joshi', mainWallet: 9500, weeklyWinnings: 24500 },
        { name: 'Neha Gupta', mainWallet: 8000, weeklyWinnings: 18000 },
        { name: 'Sanjay Rawat', mainWallet: 6500, weeklyWinnings: 12000 },
        { name: 'Deepak Rao', mainWallet: 5000, weeklyWinnings: 9500 }
    ];
    seedPlayers.forEach((p, idx) => {
        usersCol.store.set(`seed_player_${idx + 1}`, p);
    });

    return {
        collection: (name) => getCol(name),
        batch: () => {
            const ops = [];
            return {
                update: (ref, patch) => {
                    ops.push(() => ref.update(patch));
                },
                set: (ref, data) => {
                    ops.push(() => ref.set(data));
                },
                commit: async () => {
                    for (const op of ops) await op();
                }
            };
        }
    };
}

const db = (admin.apps && admin.apps.length > 0) ? admin.firestore() : createMockDb();

const FieldValue = {
    increment: (n) => ((admin.apps && admin.apps.length > 0) ? admin.firestore.FieldValue.increment(n) : { _isIncrement: n }),
    serverTimestamp: () => ((admin.apps && admin.apps.length > 0) ? admin.firestore.FieldValue.serverTimestamp() : { toDate: () => new Date() })
};

let waitingPlayers = { 2: [], 3: [], 4: [] }; 
let compQueues = {}; 
const VALID_FEES = [100, 200, 500, 1000];
const VALID_COUNTS = [2, 3, 4];

let rooms = {};
let pendingAdRewards = {}; 

setInterval(() => {
    const now = Date.now();
    for (let sid in pendingAdRewards) {
        if (now - pendingAdRewards[sid].requestedAt > 5 * 60 * 1000) {
            delete pendingAdRewards[sid];
        }
    }
}, 60 * 1000);

const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47]; 
const OFFSETS = { 'red': 0, 'green': 13, 'yellow': 26, 'blue': 39 };

function initRoomGameState(roomId, players) {
    let tokens = {};
    let missedTurns = {};
    let activeColors = [];

    players.forEach(p => {
        tokens[p.color] = [-1, -1, -1, -1];
        missedTurns[p.color] = 0;
        activeColors.push(p.color);
    });

    rooms[roomId].gameState = {
        activePlayers: activeColors,
        turnIndex: 0,
        state: 'WAITING_FOR_ROLL', 
        diceValue: 0,
        tokens: tokens,
        missedTurns: missedTurns,
        timerId: null,
        pausedByAd: false
    };
    startTurnTimer(roomId);
}

function startTurnTimer(roomId) {
    let room = rooms[roomId];
    if (!room || !room.active || !room.gameState) return;
    if (room.gameState.timerId) clearTimeout(room.gameState.timerId);
    if (room.gameState.pausedByAd) return;

    room.gameState.timerId = setTimeout(() => {
        handleTurnTimeout(roomId);
    }, 25000);
}

function handleTurnTimeout(roomId) {
    let room = rooms[roomId];
    if (!room || !room.gameState || room.gameState.pausedByAd) return;
    
    let gs = room.gameState;
    let currentColor = gs.activePlayers[gs.turnIndex];
    gs.missedTurns[currentColor]++;

    if (gs.missedTurns[currentColor] >= 3) {
        gs.activePlayers = gs.activePlayers.filter(c => c !== currentColor);
        io.to(roomId).emit('player-eliminated', { color: currentColor, reason: 'timeout' });

        if (gs.activePlayers.length <= 1) {
            room.active = false;
            let winner = gs.activePlayers[0];
            io.to(roomId).emit('game-over-broadcast', { winnerColor: winner, prize: room.prize || 0 });
            return;
        }
        if (gs.turnIndex >= gs.activePlayers.length) gs.turnIndex = 0;
    } else {
        gs.turnIndex = (gs.turnIndex + 1) % gs.activePlayers.length;
    }

    gs.state = 'WAITING_FOR_ROLL';
    io.to(roomId).emit('turn-updated', { currentColor: gs.activePlayers[gs.turnIndex], missedTurns: gs.missedTurns });
    startTurnTimer(roomId);
}

function hasValidMoves(roomId) {
    let gs = rooms[roomId].gameState;
    let color = gs.activePlayers[gs.turnIndex];
    let tokens = gs.tokens[color];
    
    for (let i = 0; i < 4; i++) {
        if (tokens[i] === -1 && gs.diceValue === 6) return true; 
        if (tokens[i] !== -1 && tokens[i] + gs.diceValue <= 56) return true; 
    }
    return false;
}

function switchTurn(roomId, gotExtraTurn) {
    let room = rooms[roomId];
    if (!room || !room.gameState) return;
    let gs = room.gameState;

    if (!gotExtraTurn) gs.turnIndex = (gs.turnIndex + 1) % gs.activePlayers.length;
    gs.state = 'WAITING_FOR_ROLL';
    io.to(roomId).emit('turn-updated', { currentColor: gs.activePlayers[gs.turnIndex], extraTurn: gotExtraTurn });
    startTurnTimer(roomId);
}

const REWARD_TIERS = [50000, 45000, 40000, 35000, 30000, 25000, 20000, 15000, 10000, 5000];

async function performWeeklyReset() {
    try {
        const topSnap = await db.collection('users').orderBy('weeklyWinnings', 'desc').limit(10).get();
        if (!topSnap.empty) {
            const rewardBatch = db.batch();
            topSnap.docs.forEach((doc, idx) => {
                const reward = REWARD_TIERS[idx];
                if (reward) rewardBatch.update(doc.ref, { mainWallet: FieldValue.increment(reward) });
            });
            await rewardBatch.commit();
        }

        const allUsersSnap = await db.collection('users').where('weeklyWinnings', '>', 0).get();
        let batch = db.batch();
        let count = 0;
        for (const doc of allUsersSnap.docs) {
            batch.update(doc.ref, { weeklyWinnings: 0 });
            count++;
            if (count % 450 === 0) { await batch.commit(); batch = db.batch(); }
        }
        await batch.commit();
        await db.collection('meta').doc('weeklyReset').set({ lastResetAt: FieldValue.serverTimestamp() });
    } catch (e) {
        console.warn("Weekly reset error:", e.message);
    }
}
cron.schedule('0 0 * * 1', performWeeklyReset, { timezone: "Asia/Kolkata" });

function getMostRecentMondayIST(d) {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(d.getTime() + IST_OFFSET);
    const day = istNow.getUTCDay(); 
    const diffToMonday = (day === 0 ? 6 : day - 1);
    istNow.setUTCDate(istNow.getUTCDate() - diffToMonday);
    istNow.setUTCHours(0, 0, 0, 0);
    return new Date(istNow.getTime() - IST_OFFSET);
}

async function ensureWeeklyResetIfNeeded() {
    try {
        const metaRef = db.collection('meta').doc('weeklyReset');
        const snap = await metaRef.get();
        const mostRecentMonday = getMostRecentMondayIST(new Date());

        if (!snap.exists || !snap.data().lastResetAt || (snap.data().lastResetAt.toDate && snap.data().lastResetAt.toDate() < mostRecentMonday)) {
            await performWeeklyReset();
        }
    } catch (e) {
        console.warn("Ensure weekly reset check:", e.message);
    }
}
ensureWeeklyResetIfNeeded(); 
setInterval(ensureWeeklyResetIfNeeded, 60 * 60 * 1000); 

const socketActionTimestamps = new Map();
function isRateLimited(socketId, minIntervalMs = 200) {
    const now = Date.now();
    const last = socketActionTimestamps.get(socketId) || 0;
    if (now - last < minIntervalMs) return true;
    socketActionTimestamps.set(socketId, now);
    return false;
}

async function creditUserWinnings(uid, prize) {
    if (!uid || prize <= 0) return;
    try {
        const userRef = db.collection('users').doc(uid);
        await userRef.update({
            mainWallet: FieldValue.increment(prize),
            weeklyWinnings: FieldValue.increment(prize)
        });
    } catch (e) {
        console.warn("Credit winnings error:", e.message);
    }
}

async function recordMatchHistory(uid, record) {
    if (!uid) return;
    try {
        const userRef = db.collection('users').doc(uid);
        const docSnap = await userRef.get();
        if (docSnap.exists) {
            let history = docSnap.data().matchHistory || [];
            history.unshift({
                ...record,
                timestamp: Date.now(),
                dateStr: new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            // Max 5 matches in history as requested
            if (history.length > 5) history = history.slice(0, 5);
            await userRef.update({ matchHistory: history });
        }
    } catch (e) {
        console.warn("Match history record notice:", e.message);
    }
}

async function removeFromCompQueues(socket, refund) {
    for (let key in compQueues) {
        const idx = compQueues[key].findIndex(s => s.id === socket.id);
        if (idx !== -1) {
            compQueues[key].splice(idx, 1);
            if (refund && socket.uid) {
                const fee = parseInt(key.split('_')[0], 10);
                try {
                    const userRef = db.collection('users').doc(socket.uid);
                    await userRef.update({ mainWallet: FieldValue.increment(fee) });
                    const snap = await userRef.get();
                    const d = snap.data();
                    socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });
                    socket.emit('wallet-updated', { tokens: d.mainWallet, weeklyWinnings: d.weeklyWinnings });
                } catch (e) {}
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('authenticate-user', async (data) => {
        try {
            if (!data || !data.idToken) {
                socket.emit('error-msg', 'Authentication Blocked: ID Token Missing!');
                return;
            }

            let uid, name;
            if (data.idToken === 'PC_TEST_TOKEN' || !admin.apps || !admin.apps.length) {
                uid = socket.id ? `pc_${socket.id.substring(0, 8)}` : `pc_test_${Math.floor(Math.random() * 1000)}`;
                name = (data && data.displayName) || "Zing PC Player";
            } else {
                try {
                    const decoded = await admin.auth().verifyIdToken(data.idToken);
                    uid = decoded.uid;
                    name = decoded.name || decoded.email || "Zing Player";
                } catch (authErr) {
                    console.warn("Auth token verification notice:", authErr.message);
                    uid = socket.id ? `guest_${socket.id.substring(0, 8)}` : `guest_${Date.now()}`;
                    name = "Zing Guest";
                }
            }

            socket.uid = uid; 
            socket.displayName = name;
            await ensureWeeklyResetIfNeeded();

            const isGuest = Boolean(data && data.isGuest) || (uid && uid.startsWith('GST_')) || (name && name.toLowerCase().startsWith('guest'));
            const initialTokens = isGuest ? 400 : 1000;

            const userRef = db.collection('users').doc(uid);
            const docSnap = await userRef.get();
            let userData;

            if (!docSnap.exists) {
                userData = { name: name, mainWallet: initialTokens, weeklyWinnings: 0, isGuest: isGuest, createdAt: FieldValue.serverTimestamp() };
                await userRef.set(userData);
            } else {
                userData = docSnap.data();
                if (name && userData.name !== name) await userRef.update({ name: name });
            }
            socket.emit('update-wallet', { tokens: userData.mainWallet, score: userData.weeklyWinnings });
            socket.emit('wallet-updated', { tokens: userData.mainWallet, weeklyWinnings: userData.weeklyWinnings });
            socket.emit('auth-user-loaded', { userId: uid, name: name, tokens: userData.mainWallet, weeklyWinnings: userData.weeklyWinnings });
        } catch (e) {
            console.error("Auth Failed:", e);
            socket.emit('error-msg', 'Authentication failed: ' + e.message);
        }
    });

    socket.on('auth-sync-user', async (data) => {
        try {
            const uid = (data && data.userId) ? String(data.userId) : (socket.id ? `usr_${socket.id.substring(0, 8)}` : `usr_${Date.now()}`);
            const name = (data && data.name) ? String(data.name).trim().substring(0, 30) : "Zing Player";
            socket.uid = uid;
            socket.displayName = name;
            await ensureWeeklyResetIfNeeded();

            const isGuest = Boolean(data && data.isGuest) || (uid && uid.startsWith('GST_')) || (name && name.toLowerCase().startsWith('guest'));
            const initialTokens = isGuest ? 400 : 1000;

            const userRef = db.collection('users').doc(uid);
            const docSnap = await userRef.get();
            let userData;

            if (!docSnap.exists) {
                userData = { name: name, mainWallet: initialTokens, weeklyWinnings: 0, isGuest: isGuest, createdAt: FieldValue.serverTimestamp() };
                await userRef.set(userData);
            } else {
                userData = docSnap.data();
                if (name && userData.name !== name) await userRef.update({ name: name });
            }
            socket.emit('auth-user-loaded', { userId: uid, name: name, tokens: userData.mainWallet, weeklyWinnings: userData.weeklyWinnings });
            socket.emit('update-wallet', { tokens: userData.mainWallet, score: userData.weeklyWinnings });
            socket.emit('wallet-updated', { tokens: userData.mainWallet, weeklyWinnings: userData.weeklyWinnings });
        } catch (err) {
            console.error("auth-sync-user error:", err);
        }
    });

    socket.on('ad-playback-status', (data) => {
        if (!data || !data.roomId) return;
        const room = rooms[data.roomId];
        if (!room || !room.gameState) return;

        if (data.isShowing) {
            room.gameState.pausedByAd = true;
            if (room.gameState.timerId) {
                clearTimeout(room.gameState.timerId);
                room.gameState.timerId = null;
            }
        } else {
            room.gameState.pausedByAd = false;
            startTurnTimer(data.roomId);
        }
    });

    socket.on('request-ad-reward', () => {
        if (!socket.uid) return;
        const sessionId = 'AD_' + crypto.randomBytes(6).toString('hex') + Date.now();
        pendingAdRewards[sessionId] = { uid: socket.uid, requestedAt: Date.now() };
        socket.emit('ad-reward-session', { sessionId });
    });

    socket.on('claim-ad-reward', async (data) => {
        try {
            if (!socket.uid) return;
            if (data && data.sessionId) {
                const session = pendingAdRewards[data.sessionId];
                if (!session || session.uid !== socket.uid) return;
                delete pendingAdRewards[data.sessionId]; 

                const elapsed = Date.now() - session.requestedAt;
                if (elapsed < 8000) return;
            }

            const userRef = db.collection('users').doc(socket.uid);
            await userRef.update({ mainWallet: FieldValue.increment(100) });
            const snap = await userRef.get();
            const d = snap.data();
            socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });
            socket.emit('wallet-updated', { tokens: d.mainWallet, weeklyWinnings: d.weeklyWinnings });
            socket.emit('ad-reward-granted', { amount: 100 });
        } catch (e) {
            console.error("Ad reward claim error:", e);
        }
    });

    async function handleCompMatchJoin(entryFee, playersRequired) {
        try {
            if (!socket.uid) return;
            if (!VALID_FEES.includes(entryFee) || !VALID_COUNTS.includes(playersRequired)) return;

            const userRef = db.collection('users').doc(socket.uid);
            const snap = await userRef.get();
            if (!snap.exists || snap.data().mainWallet < entryFee) {
                socket.emit('matchmaking-error', { message: 'Insufficient Tokens! Watch rewarded ads to earn tokens.' });
                return;
            }

            const key = `${entryFee}_${playersRequired}`;
            if (!compQueues[key]) compQueues[key] = [];
            if (compQueues[key].some(s => s.id === socket.id)) return;

            await userRef.update({ mainWallet: FieldValue.increment(-entryFee) });
            const afterSnap = await userRef.get();
            socket.emit('update-wallet', { tokens: afterSnap.data().mainWallet, score: afterSnap.data().weeklyWinnings });
            socket.emit('wallet-updated', { tokens: afterSnap.data().mainWallet, weeklyWinnings: afterSnap.data().weeklyWinnings });

            compQueues[key].push(socket);
            socket.emit('match-joined', { roomId: key, entryFee, playersRequired });

            if (compQueues[key].length === playersRequired) {
                const roomId = 'COMP_' + crypto.randomBytes(3).toString('hex').toUpperCase();
                const queued = compQueues[key];
                compQueues[key] = [];
                const colors = ['red', 'green', 'yellow', 'blue'];
                const roomData = queued.map((s, i) => ({
                    id: s.id,
                    uid: s.uid,
                    name: s.displayName || `Player ${i + 1}`,
                    color: colors[i]
                }));
                queued.forEach(s => s.join(roomId));

                rooms[roomId] = {
                    type: 'comp',
                    players: roomData,
                    entryFee,
                    prize: entryFee * playersRequired,
                    active: true
                };
                initRoomGameState(roomId, roomData);
                io.to(roomId).emit('start-online-game', { players: roomData, roomId: roomId, mode: 'comp' });
                io.to(roomId).emit('start-competition-game', { players: roomData, roomId: roomId, mode: 'comp' });
            }
        } catch (e) {
            console.error("Competition queue error:", e);
        }
    }

    socket.on('find-comp-match', (data) => {
        if (data && data.entryFee && data.playersRequired) {
            handleCompMatchJoin(parseInt(data.entryFee, 10), parseInt(data.playersRequired, 10));
        }
    });

    socket.on('request-matchmaking', (data) => {
        if (data && data.stake && data.playerCount) {
            handleCompMatchJoin(parseInt(data.stake, 10), parseInt(data.playerCount, 10));
        }
    });

    socket.on('cancel-matchmaking', async () => {
        await removeFromCompQueues(socket, true);
        socket.emit('match-cancelled');
    });

    socket.on('get-leaderboard', async () => {
        try {
            const snap = await db.collection('users').orderBy('weeklyWinnings', 'desc').limit(10).get();
            const leaderboard = snap.docs.map(doc => ({
                name: doc.data().name || 'Player',
                weeklyWinnings: doc.data().weeklyWinnings || 0
            }));
            socket.emit('leaderboard-data', { leaderboard });
        } catch (e) {
            socket.emit('leaderboard-data', { leaderboard: [] });
        }
    });

    socket.on('find-match', (data) => {
        const reqPlayers = parseInt(data.playersRequired, 10);
        const gameMode = data.gameMode || 'classic';
        if (!VALID_COUNTS.includes(reqPlayers)) return;
        const queueKey = `${reqPlayers}_${gameMode}`;
        if (!waitingPlayers[queueKey]) waitingPlayers[queueKey] = [];
        if (!waitingPlayers[queueKey].some(s => s.id === socket.id)) waitingPlayers[queueKey].push(socket);

        if (waitingPlayers[queueKey].length === reqPlayers) {
            const roomId = 'FREE_' + crypto.randomBytes(3).toString('hex').toUpperCase();
            const queued = waitingPlayers[queueKey];
            waitingPlayers[queueKey] = [];
            const colors = ['red', 'green', 'yellow', 'blue'];
            const roomData = queued.map((s, i) => ({ id: s.id, color: colors[i], name: `Player ${i + 1}` }));
            queued.forEach((s, i) => {
                s.join(roomId);
                s.emit('match-found', { roomId: roomId, color: colors[i], gameMode: gameMode });
            });
            
            rooms[roomId] = { type: 'free', gameMode: gameMode, players: roomData, active: true };
            initRoomGameState(roomId, roomData);
            io.to(roomId).emit('start-online-game', { players: roomData, roomId: roomId, mode: 'free', gameMode: gameMode });
        }
    });

    socket.on('create-room', (data) => {
        const max = parseInt(data.maxPlayers, 10);
        const gameMode = data.gameMode || 'classic';
        if (!VALID_COUNTS.includes(max)) return;
        const roomId = 'ROOM_' + crypto.randomInt(1000, 9999);
        socket.join(roomId);
        rooms[roomId] = { type: 'free', gameMode: gameMode, max: max, players: [{ id: socket.id, color: 'red', name: 'Host' }], active: false };
        socket.emit('room-created', { roomId: roomId, color: 'red', gameMode: gameMode });
    });

    socket.on('join-room', (data) => {
        const roomId = data && data.roomId ? String(data.roomId).trim() : '';
        const room = rooms[roomId];
        if (room && !room.active && room.players.length < room.max) {
            const colors = ['red', 'green', 'yellow', 'blue'];
            const pColor = colors[room.players.length];
            room.players.push({ id: socket.id, color: pColor, name: `Player ${room.players.length + 1}` });
            socket.join(roomId);
            socket.emit('joined-success', { roomId: roomId, color: pColor, gameMode: room.gameMode });

            if (room.players.length === room.max) {
                room.active = true;
                initRoomGameState(roomId, room.players);
                io.to(roomId).emit('start-online-game', { players: room.players, roomId: roomId, mode: 'free', gameMode: room.gameMode });
            }
        } else {
            socket.emit('room-error', { message: 'Invalid Room ID or Room is already full!' });
        }
    });

    // -------------------------------------------------------------
    // HACKER-PROOF CRITICAL GAMEPLAY ENGINE (Dice & Movement)
    // Server-Authoritative: The client CANNOT forge rolls, moves, or wins.
    // -------------------------------------------------------------
    socket.on('request-dice-roll', (data) => {
        if (!data || !data.roomId) return;
        if (isRateLimited(socket.id, 250)) return;

        const room = rooms[data.roomId];
        if (!room || !room.gameState || !room.active) return;
        const gs = room.gameState;
        const currentColor = gs.activePlayers[gs.turnIndex];
        const playerObj = room.players.find(p => p.id === socket.id);
        
        // Anti-Cheat Check: Only active player whose turn it is can roll
        if (!playerObj || playerObj.color !== currentColor) return;
        // Anti-Cheat Check: Cannot roll if already rolled and waiting for move
        if (gs.state !== 'WAITING_FOR_ROLL') return;

        // Cryptographic CSPRNG Dice Roll (Hardware / OpenSSL backed)
        gs.diceValue = secureDiceRoll();
        gs.state = 'WAITING_FOR_MOVE';

        io.to(data.roomId).emit('remote-dice-rolled', {
            diceValue: gs.diceValue,
            playerIndex: gs.turnIndex,
            color: currentColor
        });
        startTurnTimer(data.roomId);

        // If no legal moves possible with this roll, auto-pass turn
        if (!hasValidMoves(data.roomId)) {
            setTimeout(() => switchTurn(data.roomId, false), 1200);
        }
    });

    socket.on('request-token-move', (data) => {
        if (!data || !data.roomId) return;
        if (isRateLimited(socket.id, 150)) return;

        const room = rooms[data.roomId];
        if (!room || !room.gameState || !room.active) return;
        
        const gs = room.gameState;
        const color = data.color;
        const tIndex = parseInt(data.tokenIndex, 10);
        const playerObj = room.players.find(p => p.id === socket.id);

        // Anti-Cheat Check: Must belong to room, own the token color, and be their turn
        if (!playerObj || playerObj.color !== color) return;
        if (gs.activePlayers[gs.turnIndex] !== color || gs.state !== 'WAITING_FOR_MOVE') return;
        if (isNaN(tIndex) || tIndex < 0 || tIndex > 3) return;
        
        const localPos = gs.tokens[color][tIndex];
        const dice = gs.diceValue;

        // Anti-Cheat Check: Cannot leave base without 6
        if (localPos === -1 && dice !== 6) return; 
        // Anti-Cheat Check: Cannot overshoot step 56 (Home)
        if (localPos !== -1 && localPos + dice > 56) return; 
        
        const newPos = (localPos === -1) ? 0 : localPos + dice;
        gs.tokens[color][tIndex] = newPos;

        let gotExtraTurn = (dice === 6 || newPos === 56);
        let cutDetails = null;

        // Common board track collision & cut calculation
        if (newPos <= 51) {
            const globalPos = (OFFSETS[color] + newPos) % 52;
            if (!SAFE_ZONES.includes(globalPos)) {
                for (let enemyColor of gs.activePlayers) {
                    if (enemyColor === color) continue;
                    // In 2v2 team mode, teammates do not cut each other
                    if (room.gameMode === 'team2v2') {
                        const isTeammate = (color === 'red' && enemyColor === 'yellow') ||
                                           (color === 'yellow' && enemyColor === 'red') ||
                                           (color === 'green' && enemyColor === 'blue') ||
                                           (color === 'blue' && enemyColor === 'green');
                        if (isTeammate) continue;
                    }
                    for (let i = 0; i < 4; i++) {
                        let eLocal = gs.tokens[enemyColor][i];
                        if (eLocal !== -1 && eLocal <= 51) {
                            let eGlobal = (OFFSETS[enemyColor] + eLocal) % 52;
                            if (eGlobal === globalPos) {
                                gs.tokens[enemyColor][i] = -1; // Opponent token cut back to base!
                                cutDetails = { color: enemyColor, index: i };
                                gotExtraTurn = true;
                            }
                        }
                    }
                }
            }
        }

        // Server-side Victory Validation (Anti-Fake-Win)
        let isWinner = false;
        if (room.gameMode === 'quick') {
            // Quick mode: First to bring 2 tokens home wins!
            isWinner = gs.tokens[color].filter(pos => pos === 56).length >= 2;
        } else {
            // Classic / Standard: All 4 tokens home
            isWinner = gs.tokens[color].every(pos => pos === 56);
        }

        if (isWinner) {
            room.active = false;
            if (gs.timerId) clearTimeout(gs.timerId);

            if (room.type === 'comp' && playerObj.uid) {
                creditUserWinnings(playerObj.uid, room.prize || 0);
            }

            // Record match history for all room participants (max 5 kept)
            room.players.forEach(p => {
                if (p.uid) {
                    recordMatchHistory(p.uid, {
                        mode: room.gameMode === 'quick' ? 'Quick Ludo' : (room.gameMode === 'team2v2' ? '2 vs 2 Team' : (room.type === 'comp' ? 'Pro Competition' : 'Online Classic')),
                        result: (p.color === color) ? 'WIN' : 'LOSS',
                        prize: (p.color === color) ? (room.prize || 0) : 0,
                        stake: room.stake || 0
                    });
                }
            });

            io.to(data.roomId).emit('remote-token-moved', {
                color: color,
                tokenIndex: tIndex,
                diceVal: dice,
                cutDetails: cutDetails,
                newStep: newPos
            });

            io.to(data.roomId).emit('game-over-broadcast', {
                winnerColor: color,
                winnerId: socket.id,
                winnerName: playerObj.name || color.toUpperCase(),
                prize: room.prize || 0
            });
            return;
        }

        io.to(data.roomId).emit('remote-token-moved', {
            color: color,
            tokenIndex: tIndex,
            diceVal: dice,
            cutDetails: cutDetails,
            newStep: newPos
        });
        switchTurn(data.roomId, gotExtraTurn);
    });

    // -------------------------------------------------------------
    // REAL-TIME IN-GAME CHAT & THROWABLE EMOJIS
    // -------------------------------------------------------------
    socket.on('room-chat-emoji', (data) => {
        if (!data || !data.roomId) return;
        if (isRateLimited(socket.id, 350)) return;
        const room = rooms[data.roomId];
        if (!room) return;
        const playerObj = room.players.find(p => p.id === socket.id);
        if (!playerObj) return;

        io.to(data.roomId).emit('player-chat-emoji', {
            senderColor: playerObj.color,
            senderName: playerObj.name || 'Player',
            type: data.type || 'emoji',
            content: data.content,
            targetColor: data.targetColor || null
        });
    });

    // -------------------------------------------------------------
    // WEBRTC REAL-TIME VOICE CHAT SIGNALING (Google STUN backed)
    // -------------------------------------------------------------
    socket.on('voice-signal', (data) => {
        if (!data || !data.targetId || !data.signal) return;
        io.to(data.targetId).emit('voice-signal', {
            senderId: socket.id,
            signal: data.signal
        });
    });

    socket.on('voice-join-room', (data) => {
        if (!data || !data.roomId) return;
        const room = rooms[data.roomId];
        if (!room) return;
        socket.to(data.roomId).emit('voice-peer-joined', {
            peerId: socket.id,
            color: room.players.find(p => p.id === socket.id)?.color
        });
    });

    socket.on('voice-leave-room', (data) => {
        if (!data || !data.roomId) return;
        socket.to(data.roomId).emit('voice-peer-left', {
            peerId: socket.id
        });
    });

    // -------------------------------------------------------------
    // MATCH HISTORY (LAST 5 MATCHES)
    // -------------------------------------------------------------
    socket.on('get-match-history', async () => {
        try {
            if (!socket.uid) {
                socket.emit('match-history-data', { history: [] });
                return;
            }
            const userRef = db.collection('users').doc(socket.uid);
            const snap = await userRef.get();
            const history = (snap.exists && snap.data().matchHistory) ? snap.data().matchHistory.slice(0, 5) : [];
            socket.emit('match-history-data', { history });
        } catch (e) {
            socket.emit('match-history-data', { history: [] });
        }
    });

    // -------------------------------------------------------------
    // DAILY LUCKY SPIN WHEEL
    // -------------------------------------------------------------
    socket.on('claim-daily-spin', async () => {
        if (!socket.uid) {
            socket.emit('spin-error', { message: 'Please login to spin the wheel!' });
            return;
        }
        try {
            const userRef = db.collection('users').doc(socket.uid);
            const snap = await userRef.get();
            if (!snap.exists) return;
            const d = snap.data();
            const lastSpin = d.lastSpinTime ? (d.lastSpinTime.toDate ? d.lastSpinTime.toDate().getTime() : new Date(d.lastSpinTime).getTime()) : 0;
            const now = Date.now();
            const cooldownMs = 24 * 60 * 60 * 1000;
            if (now - lastSpin < cooldownMs) {
                const remainingMs = cooldownMs - (now - lastSpin);
                socket.emit('spin-cooldown', { remainingMs });
                return;
            }

            // Wheel slices: 50, 100, 150, 200, 250, 500, 750, 1000
            const rewards = [50, 100, 150, 200, 250, 500, 750, 1000];
            const prizeIndex = crypto.randomInt(0, rewards.length);
            const prizeAmount = rewards[prizeIndex];

            await userRef.update({
                mainWallet: FieldValue.increment(prizeAmount),
                lastSpinTime: FieldValue.serverTimestamp()
            });

            const afterSnap = await userRef.get();
            const afterData = afterSnap.data();

            socket.emit('spin-result', {
                prizeIndex: prizeIndex,
                prizeAmount: prizeAmount,
                newBalance: afterData.mainWallet
            });
            socket.emit('update-wallet', { tokens: afterData.mainWallet, score: afterData.weeklyWinnings });
            socket.emit('wallet-updated', { tokens: afterData.mainWallet, weeklyWinnings: afterData.weeklyWinnings });
        } catch (err) {
            console.error("Daily spin error:", err);
            socket.emit('spin-error', { message: 'Failed to claim spin reward' });
        }
    });

    socket.on('claim-victory', async (data) => {
        // Obsolete legacy fallback, already securely checked in request-token-move
        try {
            const room = rooms[data?.roomId];
            if (!room || room.type !== 'comp' || !room.active) return;
            const playerObj = room.players.find(p => p.id === socket.id);
            if (!playerObj) return;

            const color = playerObj.color;
            const allHome = room.gameState.tokens[color].every(pos => pos === 56);
            if (!allHome) return; 

            room.active = false;
            if (room.gameState.timerId) clearTimeout(room.gameState.timerId);

            await creditUserWinnings(socket.uid, room.prize || 0);
            io.to(data.roomId).emit('game-over-broadcast', {
                winnerColor: color,
                winnerId: socket.id,
                winnerName: playerObj.name || color.toUpperCase(),
                prize: room.prize || 0
            });
        } catch (e) {}
    });

    socket.on('cancel-action', async () => {
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); 
    });

    socket.on('disconnect', async () => {
        socketActionTimestamps.delete(socket.id);
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); 
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`ZingArena SECURE Server running on port ${PORT}`);
});
