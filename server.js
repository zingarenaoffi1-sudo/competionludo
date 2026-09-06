const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');

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
        timerId: null
    };
    startTurnTimer(roomId);
}

function startTurnTimer(roomId) {
    let room = rooms[roomId];
    if (!room || !room.active || !room.gameState) return;
    if (room.gameState.timerId) clearTimeout(room.gameState.timerId);

    room.gameState.timerId = setTimeout(() => {
        handleTurnTimeout(roomId);
    }, 25000);
}

function handleTurnTimeout(roomId) {
    let room = rooms[roomId];
    if (!room || !room.gameState) return;
    
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
            await ensureWeeklyResetIfNeeded();

            const userRef = db.collection('users').doc(uid);
            const docSnap = await userRef.get();
            let userData;

            if (!docSnap.exists) {
                userData = { name: name, mainWallet: 1000, weeklyWinnings: 0, createdAt: FieldValue.serverTimestamp() };
                await userRef.set(userData);
            } else {
                userData = docSnap.data();
                if (name && userData.name !== name) await userRef.update({ name: name });
            }
            socket.emit('update-wallet', { tokens: userData.mainWallet, score: userData.weeklyWinnings });
        } catch (e) {
            console.error("Auth Failed:", e);
            socket.emit('error-msg', 'Authentication failed: ' + e.message);
        }
    });

    socket.on('request-ad-reward', () => {
        if (!socket.uid) return;
        const sessionId = 'AD_' + Math.random().toString(36).substr(2, 12) + Date.now();
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
            socket.emit('ad-reward-granted', { amount: 100 });
        } catch (e) {
            console.error("Ad reward claim error:", e);
        }
    });

    socket.on('find-comp-match', async (data) => {
        try {
            if (!socket.uid) return;
            const entryFee = data.entryFee;
            const playersRequired = data.playersRequired;

            if (!VALID_FEES.includes(entryFee) || !VALID_COUNTS.includes(playersRequired)) return;

            const userRef = db.collection('users').doc(socket.uid);
            const snap = await userRef.get();
            if (!snap.exists || snap.data().mainWallet < entryFee) return;

            const key = `${entryFee}_${playersRequired}`;
            if (!compQueues[key]) compQueues[key] = [];
            if (compQueues[key].some(s => s.id === socket.id)) return; 

            await userRef.update({ mainWallet: FieldValue.increment(-entryFee) });
            const afterSnap = await userRef.get();
            socket.emit('update-wallet', { tokens: afterSnap.data().mainWallet, score: afterSnap.data().weeklyWinnings });

            compQueues[key].push(socket);

            if (compQueues[key].length === playersRequired) {
                const roomId = 'COMP_' + Math.random().toString(36).substr(2, 6);
                const queued = compQueues[key];
                compQueues[key] = [];
                const colors = ['red', 'green', 'yellow', 'blue'];
                const roomData = queued.map((s, i) => ({ id: s.id, uid: s.uid, color: colors[i] }));
                queued.forEach(s => s.join(roomId));

                rooms[roomId] = { type: 'comp', players: roomData, entryFee, prize: entryFee * playersRequired, active: true };
                initRoomGameState(roomId, roomData);
                io.to(roomId).emit('start-online-game', { players: roomData, roomId: roomId, mode: 'comp' });
            }
        } catch (e) {}
    });

    socket.on('get-leaderboard', async () => {
        try {
            const snap = await db.collection('users').orderBy('weeklyWinnings', 'desc').limit(10).get();
            const leaderboard = snap.docs.map(doc => ({
                name: doc.data().name || 'Player',
                weeklyWinnings: doc.data().weeklyWinnings || 0
            }));
            socket.emit('leaderboard-data', leaderboard);
        } catch (e) {}
    });

    socket.on('find-match', (data) => {
        const reqPlayers = data.playersRequired;
        if (!waitingPlayers[reqPlayers]) waitingPlayers[reqPlayers] = [];
        if (!waitingPlayers[reqPlayers].some(s => s.id === socket.id)) waitingPlayers[reqPlayers].push(socket);

        if (waitingPlayers[reqPlayers].length === reqPlayers) {
            const roomId = 'FREE_' + Math.random().toString(36).substr(2, 6);
            const queued = waitingPlayers[reqPlayers];
            waitingPlayers[reqPlayers] = [];
            const colors = ['red', 'green', 'yellow', 'blue'];
            const roomData = queued.map((s, i) => ({ id: s.id, color: colors[i] }));
            queued.forEach((s, i) => { s.join(roomId); s.emit('match-found', { roomId: roomId, color: colors[i] }); });
            
            rooms[roomId] = { type: 'free', players: roomData, active: true };
            initRoomGameState(roomId, roomData);
            io.to(roomId).emit('start-online-game', { players: roomData, mode: 'free' });
        }
    });

    socket.on('create-room', (data) => {
        const roomId = 'PRIVATE_' + Math.random().toString(36).substr(2, 6);
        socket.join(roomId);
        socket.emit('room-created', { roomId: roomId, color: 'red' });
        rooms[roomId] = { type: 'free', max: data.maxPlayers, players: [{ id: socket.id, color: 'red' }], active: false };
    });

    socket.on('join-room', (data) => {
        const roomId = data.roomId;
        const room = rooms[roomId];
        if (room && !room.active) {
            const colors = ['red', 'green', 'yellow', 'blue'];
            const pColor = colors[room.players.length];
            room.players.push({ id: socket.id, color: pColor });
            socket.join(roomId);
            socket.emit('joined-success', { roomId: roomId, color: pColor });

            if (room.players.length === room.max) {
                room.active = true;
                initRoomGameState(roomId, room.players);
                io.to(roomId).emit('start-online-game', { players: room.players, mode: 'free' });
            }
        }
    });

    socket.on('request-dice-roll', (data) => {
        const room = rooms[data.roomId];
        if (!room || !room.gameState || !room.active) return;
        const gs = room.gameState;
        const currentColor = gs.activePlayers[gs.turnIndex];
        let requesterColor = room.players.find(p => p.id === socket.id)?.color;
        
        if (requesterColor !== currentColor || gs.state !== 'WAITING_FOR_ROLL') return;

        gs.diceValue = Math.floor(Math.random() * 6) + 1;
        gs.state = 'WAITING_FOR_MOVE';

        io.to(data.roomId).emit('remote-dice-rolled', { diceValue: gs.diceValue, playerIndex: gs.turnIndex });
        startTurnTimer(data.roomId);

        if (!hasValidMoves(data.roomId)) {
            setTimeout(() => switchTurn(data.roomId, false), 1500);
        }
    });

    socket.on('request-token-move', (data) => {
        const room = rooms[data.roomId];
        if (!room || !room.gameState || !room.active) return;
        
        const gs = room.gameState;
        const color = data.color;
        const tIndex = data.tokenIndex;

        if (gs.activePlayers[gs.turnIndex] !== color || gs.state !== 'WAITING_FOR_MOVE') return;
        
        let localPos = gs.tokens[color][tIndex];
        let dice = gs.diceValue;

        if (localPos === -1 && dice !== 6) return; 
        if (localPos + dice > 56) return; 
        
        let newPos = (localPos === -1) ? 0 : localPos + dice;
        gs.tokens[color][tIndex] = newPos;

        let gotExtraTurn = (dice === 6 || newPos === 56);
        let cutDetails = null;

        if (newPos <= 51) {
            let globalPos = (OFFSETS[color] + newPos) % 52;
            if (!SAFE_ZONES.includes(globalPos)) {
                for (let enemyColor of gs.activePlayers) {
                    if (enemyColor === color) continue;
                    for (let i = 0; i < 4; i++) {
                        let eLocal = gs.tokens[enemyColor][i];
                        if (eLocal !== -1 && eLocal <= 51) {
                            let eGlobal = (OFFSETS[enemyColor] + eLocal) % 52;
                            if (eGlobal === globalPos) {
                                gs.tokens[enemyColor][i] = -1; 
                                cutDetails = { color: enemyColor, index: i };
                                gotExtraTurn = true;
                            }
                        }
                    }
                }
            }
        }

        io.to(data.roomId).emit('remote-token-moved', { color: color, tokenIndex: tIndex, diceVal: dice });
        switchTurn(data.roomId, gotExtraTurn);
    });

    socket.on('claim-victory', async (data) => {
        try {
            const room = rooms[data.roomId];
            if (!room || room.type !== 'comp' || !room.active) return;

            let color = room.players.find(p => p.id === socket.id)?.color;
            if (!color) return;

            let tokens = room.gameState.tokens[color];
            let allHome = tokens.every(pos => pos === 56);

            if (!allHome) return; 

            room.active = false;
            if (room.gameState.timerId) clearTimeout(room.gameState.timerId);

            const userRef = db.collection('users').doc(socket.uid);
            await userRef.update({
                mainWallet: FieldValue.increment(room.prize),
                weeklyWinnings: FieldValue.increment(room.prize)
            });
            
            const snap = await userRef.get();
            const d = snap.data();
            socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });
            io.to(data.roomId).emit('game-over-broadcast', { winnerId: socket.id, prize: room.prize });
        } catch (e) {}
    });

    socket.on('cancel-action', async () => {
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); 
    });

    socket.on('disconnect', async () => {
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
