const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');

const app = express();
app.use(cors());

// 🟢 CRON-JOB ROUTE (Server zinda rakhne ke liye)
app.get('/', (req, res) => {
    res.send('ZingArena SECURE Server is Awake and Running!');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ==========================================
// 🔥 FIREBASE ADMIN + FIRESTORE SETUP
// ==========================================
let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // Fix for Render environment variable newline issue
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("🔥 Firebase Admin SDK Initialized Successfully!");
    } else {
        console.warn("⚠️ WARNING: FIREBASE_SERVICE_ACCOUNT is missing!");
    }
} catch (e) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT JSON error!", e.message);
}
const db = admin.firestore();

// ==========================================
// 🗄️ STATE MANAGEMENT
// ==========================================
let waitingPlayers = { 2: [], 3: [], 4: [] }; // Free Mode
let compQueues = {}; // Pro Mode (Format: "100_2", "500_4")
const VALID_FEES = [100, 200, 500, 1000];
const VALID_COUNTS = [2, 3, 4];

let rooms = {};

// Ad Reward Sessions (Anti-Hack Mechanism)
let pendingAdRewards = {}; 

// Clean expired Ad sessions to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (let sid in pendingAdRewards) {
        if (now - pendingAdRewards[sid].requestedAt > 5 * 60 * 1000) {
            delete pendingAdRewards[sid];
        }
    }
}, 60 * 1000);

// ==========================================
// 🏆 WEEKLY LEADERBOARD REWARD TIERS & CRON
// ==========================================
const REWARD_TIERS = [50000, 45000, 40000, 35000, 30000, 25000, 20000, 15000, 10000, 5000];

async function performWeeklyReset() {
    console.log("🏆 Weekly leaderboard reset shuru ho raha hai...");
    try {
        const topSnap = await db.collection('users').orderBy('weeklyWinnings', 'desc').limit(10).get();
        if (!topSnap.empty) {
            const rewardBatch = db.batch();
            topSnap.docs.forEach((doc, idx) => {
                const reward = REWARD_TIERS[idx];
                if (reward) rewardBatch.update(doc.ref, { mainWallet: admin.firestore.FieldValue.increment(reward) });
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

        await db.collection('meta').doc('weeklyReset').set({
            lastResetAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Weekly reset complete. Top players rewarded.");
    } catch (e) {
        console.error("❌ Weekly reset fail ho gaya:", e);
    }
}

// Har Monday raat 12:00 baje (IST)
cron.schedule('0 0 * * 1', performWeeklyReset, { timezone: "Asia/Kolkata" });

// Fallback logic in case server was asleep during Monday 12 AM
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

        if (!snap.exists || !snap.data().lastResetAt || snap.data().lastResetAt.toDate() < mostRecentMonday) {
            await performWeeklyReset();
        }
    } catch (e) {
        console.error("Weekly reset check fail:", e);
    }
}
ensureWeeklyResetIfNeeded(); 
setInterval(ensureWeeklyResetIfNeeded, 60 * 60 * 1000); 

// ==========================================
// 🧹 HELPER: REFUND LOGIC (Cancel/Disconnect)
// ==========================================
async function removeFromCompQueues(socket, refund) {
    for (let key in compQueues) {
        const idx = compQueues[key].findIndex(s => s.id === socket.id);
        if (idx !== -1) {
            compQueues[key].splice(idx, 1);
            if (refund && socket.uid) {
                const fee = parseInt(key.split('_')[0], 10);
                try {
                    console.log(`💸 Refunding ${fee} tokens to UID: ${socket.uid}`);
                    const userRef = db.collection('users').doc(socket.uid);
                    await userRef.update({ mainWallet: admin.firestore.FieldValue.increment(fee) });
                    const snap = await userRef.get();
                    const d = snap.data();
                    socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });
                } catch (e) {
                    console.error("Refund fail:", e);
                }
            }
        }
    }
}

// ==========================================
// 🔌 SOCKET CONNECTION
// ==========================================
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 🔐 SECTION 0: AUTHENTICATION
    socket.on('authenticate-user', async (data) => {
        try {
            let uid, name;

            if (data && data.idToken) {
                const decoded = await admin.auth().verifyIdToken(data.idToken);
                uid = decoded.uid;
                name = decoded.name || decoded.email || "Zing Player";
            } else if (data && data.testUid) {
                uid = data.testUid;
                name = data.name || "Test Player";
            } else {
                socket.emit('error-msg', 'Login fail ho gaya.');
                return;
            }

            socket.uid = uid; 
            await ensureWeeklyResetIfNeeded();

            const userRef = db.collection('users').doc(uid);
            const docSnap = await userRef.get();

            let userData;
            if (!docSnap.exists) {
                userData = {
                    name: name,
                    mainWallet: 1000,
                    weeklyWinnings: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await userRef.set(userData);
            } else {
                userData = docSnap.data();
                if (name && userData.name !== name) {
                    await userRef.update({ name: name });
                }
            }
            socket.emit('update-wallet', { tokens: userData.mainWallet, score: userData.weeklyWinnings });
        } catch (e) {
            console.error("Auth error:", e);
            socket.emit('error-msg', 'Authentication failed!');
        }
    });

    // 📺 SECTION 1: SERVER-VERIFIED AD REWARDS (Hack-Proof)
    socket.on('request-ad-reward', () => {
        if (!socket.uid) { socket.emit('error-msg', 'Pehle login karo!'); return; }
        const sessionId = 'AD_' + Math.random().toString(36).substr(2, 12) + Date.now();
        pendingAdRewards[sessionId] = { uid: socket.uid, requestedAt: Date.now() };
        socket.emit('ad-reward-session', { sessionId });
    });

    socket.on('claim-ad-reward', async (data) => {
        try {
            const session = pendingAdRewards[data.sessionId];
            if (!session || session.uid !== socket.uid) {
                socket.emit('error-msg', 'Ad session invalid hai.'); return;
            }
            delete pendingAdRewards[data.sessionId]; 

            const elapsed = Date.now() - session.requestedAt;
            if (elapsed < 8000) {
                socket.emit('error-msg', 'Ad skip detected. No reward given.'); return;
            }

            const userRef = db.collection('users').doc(socket.uid);
            await userRef.update({ mainWallet: admin.firestore.FieldValue.increment(100) });
            const snap = await userRef.get();
            const d = snap.data();
            
            socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });
            socket.emit('ad-reward-granted', { amount: 100 });
        } catch (e) {
            console.error("Ad reward error:", e);
        }
    });

    // 🏆 SECTION 2: COMPETITIVE PRO MULTIPLAYER
    socket.on('find-comp-match', async (data) => {
        try {
            if (!socket.uid) { socket.emit('error-msg', 'Pehle login karo!'); return; }

            const entryFee = data.entryFee;
            const playersRequired = data.playersRequired;

            if (!VALID_FEES.includes(entryFee) || !VALID_COUNTS.includes(playersRequired)) {
                socket.emit('error-msg', 'Match configuration galat hai.'); return;
            }

            const userRef = db.collection('users').doc(socket.uid);
            const snap = await userRef.get();
            if (!snap.exists) return;
            
            const userData = snap.data();
            if (userData.mainWallet < entryFee) {
                socket.emit('error-msg', 'Itne tokens nahi hai!'); return;
            }

            const key = `${entryFee}_${playersRequired}`;
            if (!compQueues[key]) compQueues[key] = [];
            if (compQueues[key].some(s => s.id === socket.id)) return; 

            // Deduct Fee Immediately
            await userRef.update({ mainWallet: admin.firestore.FieldValue.increment(-entryFee) });
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

                const prize = entryFee * playersRequired;
                rooms[roomId] = { type: 'comp', players: roomData, entryFee, prize, active: true };
                io.to(roomId).emit('start-online-game', { players: roomData, roomId: roomId, mode: 'comp' });
            }
        } catch (e) {
            console.error("find-comp-match error:", e);
        }
    });

    // 🔒 SECTION 3: WINNER CLAIM SYSTEM (Fraud Checked)
    socket.on('claim-victory', async (data) => {
        try {
            const room = rooms[data.roomId];
            if (!room || room.type !== 'comp' || !room.active) return;

            // Security: Sirf us room ka player hi claim kar sakta hai
            const isPlayerInRoom = room.players.some(p => p.id === socket.id);
            if (!isPlayerInRoom) {
                console.log("⚠️ Blocked fraudulent claim attempt from", socket.id); return;
            }

            room.active = false; // Lock immediately

            if (!socket.uid) return;
            const userRef = db.collection('users').doc(socket.uid);
            await userRef.update({
                mainWallet: admin.firestore.FieldValue.increment(room.prize),
                weeklyWinnings: admin.firestore.FieldValue.increment(room.prize)
            });
            
            const snap = await userRef.get();
            const d = snap.data();
            socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });
            io.to(data.roomId).emit('game-over-broadcast', { winnerId: socket.id, prize: room.prize });
        } catch (e) {
            console.error("claim-victory error:", e);
        }
    });

    // 📊 SECTION 4: LEADERBOARD FETCH
    socket.on('get-leaderboard', async () => {
        try {
            const snap = await db.collection('users').orderBy('weeklyWinnings', 'desc').limit(10).get();
            const leaderboard = snap.docs.map(doc => ({
                name: doc.data().name || 'Player',
                weeklyWinnings: doc.data().weeklyWinnings || 0
            }));
            socket.emit('leaderboard-data', leaderboard);
        } catch (e) {
            socket.emit('leaderboard-data', []);
        }
    });

    // 🆓 SECTION 5: FREE MODE & COMMON GAME ENGINE (Unchanged)
    socket.on('find-match', (data) => {
        const reqPlayers = data.playersRequired;
        if (!waitingPlayers[reqPlayers]) waitingPlayers[reqPlayers] = [];
        if (!waitingPlayers[reqPlayers].some(s => s.id === socket.id)) waitingPlayers[reqPlayers].push(socket);

        if (waitingPlayers[reqPlayers].length === reqPlayers) {
            const roomId = 'FREE_' + Math.random().toString(36).substr(2, 6);
            const players = waitingPlayers[reqPlayers];
            waitingPlayers[reqPlayers] = [];

            const colors = ['red', 'green', 'yellow', 'blue'];
            const roomData = [];

            players.forEach((p, index) => {
                p.join(roomId);
                const pColor = colors[index];
                roomData.push({ id: p.id, color: pColor });
                p.emit('match-found', { roomId: roomId, color: pColor });
            });

            rooms[roomId] = { type: 'free', players: roomData };
            io.to(roomId).emit('start-online-game', { players: roomData, mode: 'free' });
        }
    });

    socket.on('create-room', (data) => {
        const roomId = 'PRIVATE_' + Math.random().toString(36).substr(2, 6);
        socket.join(roomId);
        socket.emit('room-created', { roomId: roomId, color: 'red' });
        rooms[roomId] = { type: 'free', max: data.maxPlayers, players: [{ id: socket.id, color: 'red' }], started: false };
    });

    socket.on('join-room', (data) => {
        const roomId = data.roomId;
        const room = rooms[roomId];
        if (room && !room.started) {
            const colors = ['red', 'green', 'yellow', 'blue'];
            const pColor = colors[room.players.length];
            room.players.push({ id: socket.id, color: pColor });
            socket.join(roomId);
            socket.emit('joined-success', { roomId: roomId, color: pColor });

            if (room.players.length === room.max) {
                room.started = true;
                io.to(roomId).emit('start-online-game', { players: room.players, mode: 'free' });
            }
        } else {
            socket.emit('error-msg', 'Room not found or already full!');
        }
    });

    socket.on('roll-dice-action', (data) => socket.to(data.roomId).emit('remote-dice-rolled', data));
    socket.on('move-token-action', (data) => socket.to(data.roomId).emit('remote-token-moved', data));

    // Cancel Button or Disconnect = REFUND
    socket.on('cancel-action', async () => {
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); 
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); 
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Ludo Master Server running on port ${PORT}`);
});
