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
    res.send('ZingArena All-in-One Server is Awake and Running!');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ==========================================
// 🔥 FIREBASE ADMIN + FIRESTORE SETUP
// ==========================================
// ⚠️ IMPORTANT: Service account JSON GITHUB PAR KABHI COMMIT NAHI KARNA!
// Render ke dashboard mein "Environment" tab mein FIREBASE_SERVICE_ACCOUNT
// naam ka env variable banao, aur uski VALUE mein poori service account
// JSON file ka content (ek line mein) paste kar do.
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Env variable mein private_key ke "\n" kabhi-kabhi literal text ban jaate hain,
    // isliye unhe wapas asli newline mein convert karna zaroori hai warna auth fail hoga
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
} catch (e) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT env variable missing ya galat JSON hai!", e.message);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// ==========================================
// 🗄️ STATE MANAGEMENT
// ==========================================
// 1. Free Mode Queue (Purana, bina currency wala logic — bilkul waisa hi hai)
let waitingPlayers = { 2: [], 3: [], 4: [] };

// 2. Competitive Mode Queues — har (entryFee + playerCount) combo ki apni queue
// key format: "entryFee_playerCount" e.g. "100_2", "500_4"
let compQueues = {};
const VALID_FEES = [100, 200, 500, 1000];
const VALID_COUNTS = [2, 3, 4];

// 3. Ad Reward pending sessions (server-verified ad reward ke liye)
let pendingAdRewards = {}; // sessionId -> { uid, requestedAt }

let rooms = {};

// Purani expired ad-reward sessions ko har minute clean karo (memory leak na ho)
setInterval(() => {
    const now = Date.now();
    for (let sid in pendingAdRewards) {
        if (now - pendingAdRewards[sid].requestedAt > 5 * 60 * 1000) {
            delete pendingAdRewards[sid];
        }
    }
}, 60 * 1000);

// ==========================================
// 🏆 WEEKLY LEADERBOARD REWARD TIERS
// ==========================================
const REWARD_TIERS = [50000, 45000, 40000, 35000, 30000, 25000, 20000, 15000, 10000, 5000];

async function performWeeklyReset() {
    console.log("🏆 Weekly leaderboard reset shuru ho raha hai...");
    try {
        // Top 10 players ko unki weeklyWinnings ke hisaab se reward do
        const topSnap = await db.collection('users').orderBy('weeklyWinnings', 'desc').limit(10).get();
        if (!topSnap.empty) {
            const rewardBatch = db.batch();
            topSnap.docs.forEach((doc, idx) => {
                const reward = REWARD_TIERS[idx];
                if (reward) rewardBatch.update(doc.ref, { mainWallet: admin.firestore.FieldValue.increment(reward) });
            });
            await rewardBatch.commit();
        }

        // Sabki weeklyWinnings 0 kar do (500 docs ki chunks mein, Firestore batch limit ke wajah se)
        const allUsersSnap = await db.collection('users').get();
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
        console.log("✅ Weekly reset complete. Top " + topSnap.size + " players ko reward mila.");
    } catch (e) {
        console.error("❌ Weekly reset fail ho gaya:", e);
    }
}

// Primary schedule: har Monday raat 12:00 baje (India time)
cron.schedule('0 0 * * 1', performWeeklyReset, { timezone: "Asia/Kolkata" });

// Safety fallback: agar server Monday 12:00 baje so raha tha (Render free tier),
// to jab bhi server wapas jaage, yeh check karke miss hua reset khud kar lega
function getMostRecentMondayIST(d) {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(d.getTime() + IST_OFFSET);
    const day = istNow.getUTCDay(); // 0=Sun,1=Mon...6=Sat
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
ensureWeeklyResetIfNeeded(); // server start hote hi ek baar check kar lo
setInterval(ensureWeeklyResetIfNeeded, 60 * 60 * 1000); // har ghante bhi check karte raho (safety net)

// ==========================================
// 🧹 HELPER: Competitive queue se hatao + refund karo
// ==========================================
async function removeFromCompQueues(socket, refund) {
    for (let key in compQueues) {
        const idx = compQueues[key].findIndex(s => s.id === socket.id);
        if (idx !== -1) {
            compQueues[key].splice(idx, 1);
            if (refund && socket.uid) {
                const fee = parseInt(key.split('_')[0], 10);
                try {
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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // ==========================================
    // 🔐 SECTION 0: AUTHENTICATION (Firebase se verify)
    // ==========================================
    socket.on('authenticate-user', async (data) => {
        try {
            let uid, name;

            if (data && data.idToken) {
                // 🔒 REAL LOGIN: Firebase ID token ko server pe verify karo
                // Isse koi bhi client kisi aur ke UID ka bahana nahi bana sakta
                const decoded = await admin.auth().verifyIdToken(data.idToken);
                uid = decoded.uid;
                name = decoded.name || decoded.email || "Player";
            } else if (data && data.testUid) {
                // ⚠️ SIRF PC/BROWSER TESTING KE LIYE — koi real security nahi hai isme.
                // Compiled APK mein hamesha idToken hi aana chahiye.
                uid = data.testUid;
                name = data.name || "Test Player";
            } else {
                socket.emit('error-msg', 'Login fail ho gaya, dobara try karo.');
                return;
            }

            socket.uid = uid; // is socket ke saath UID hamesha ke liye jod do

            await ensureWeeklyResetIfNeeded();

            const userRef = db.collection('users').doc(uid);
            const docSnap = await userRef.get();

            let userData;
            if (!docSnap.exists) {
                // Naya player — 1000 free coins welcome bonus
                userData = {
                    name: name,
                    mainWallet: 1000,
                    weeklyWinnings: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await userRef.set(userData);
            } else {
                userData = docSnap.data();
                // Naam update kar do agar Google se naya naam mila ho
                if (name && userData.name !== name) {
                    await userRef.update({ name: name });
                }
            }

            socket.emit('update-wallet', { tokens: userData.mainWallet, score: userData.weeklyWinnings });
        } catch (e) {
            console.error("Auth error:", e);
            socket.emit('error-msg', 'Authentication fail ho gaya. Dobara login try karo.');
        }
    });

    // ==========================================
    // 📺 SECTION 1: SERVER-VERIFIED AD REWARDS
    // ==========================================
    // Step 1: Client ad dikhane se PEHLE ek session maangta hai
    socket.on('request-ad-reward', () => {
        if (!socket.uid) { socket.emit('error-msg', 'Pehle login karo!'); return; }
        const sessionId = 'AD_' + Math.random().toString(36).substr(2, 12) + Date.now();
        pendingAdRewards[sessionId] = { uid: socket.uid, requestedAt: Date.now() };
        socket.emit('ad-reward-session', { sessionId });
    });

    // Step 2: Ad poori dekhne (reward earn hone) ke BAAD hi client yeh call karega
    socket.on('claim-ad-reward', async (data) => {
        try {
            const session = pendingAdRewards[data.sessionId];
            if (!session || session.uid !== socket.uid) {
                socket.emit('error-msg', 'Ad session invalid hai.');
                return;
            }
            delete pendingAdRewards[data.sessionId]; // ek session sirf ek baar use ho sakta hai

            const elapsed = Date.now() - session.requestedAt;
            // Asli rewarded ad load+play hone mein kam se kam kuch second lagte hi hain.
            // Agar claim itni jaldi aaya hai, to yeh fake/hacked request hai.
            if (elapsed < 8000) {
                socket.emit('error-msg', 'Ad reward reject ho gaya (bahut jaldi aaya).');
                return;
            }
            if (elapsed > 5 * 60 * 1000) {
                socket.emit('error-msg', 'Ad session expire ho gaya, dobara try karo.');
                return;
            }

            const userRef = db.collection('users').doc(socket.uid);
            await userRef.update({ mainWallet: admin.firestore.FieldValue.increment(100) });
            const snap = await userRef.get();
            const d = snap.data();
            socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });
            socket.emit('ad-reward-granted', { amount: 100 });
        } catch (e) {
            console.error("Ad reward claim error:", e);
            socket.emit('error-msg', 'Kuch galat ho gaya, dobara try karo.');
        }
    });

    // ==========================================
    // 🆓 SECTION 2: NORMAL / FREE MULTIPLAYER (Purana Logic — bilkul waisa hi)
    // ==========================================
    socket.on('find-match', (data) => {
        const reqPlayers = data.playersRequired;
        if (!waitingPlayers[reqPlayers]) waitingPlayers[reqPlayers] = [];

        const isAlreadyWaiting = waitingPlayers[reqPlayers].some(s => s.id === socket.id);
        if (!isAlreadyWaiting) waitingPlayers[reqPlayers].push(socket);

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

    // ==========================================
    // 🏆 SECTION 3: COMPETITIVE PRO MULTIPLAYER (Naya, Firestore-backed)
    // ==========================================
    socket.on('find-comp-match', async (data) => {
        try {
            if (!socket.uid) { socket.emit('error-msg', 'Pehle login karo!'); return; }

            const entryFee = data.entryFee;
            const playersRequired = data.playersRequired;

            if (!VALID_FEES.includes(entryFee) || !VALID_COUNTS.includes(playersRequired)) {
                socket.emit('error-msg', 'Match configuration galat hai.');
                return;
            }

            const userRef = db.collection('users').doc(socket.uid);
            const snap = await userRef.get();
            if (!snap.exists) { socket.emit('error-msg', 'Account nahi mila, dobara login karo.'); return; }
            const userData = snap.data();

            if (userData.mainWallet < entryFee) {
                socket.emit('error-msg', 'Itne tokens nahi hai aapke paas! Ad dekh ke tokens lo.');
                return;
            }

            const key = `${entryFee}_${playersRequired}`;
            if (!compQueues[key]) compQueues[key] = [];
            const already = compQueues[key].some(s => s.id === socket.id);
            if (already) return; // pehle se hi queue mein hai

            // Entry fee turant kaat lo (queue mein ghusne ke saath hi)
            await userRef.update({ mainWallet: admin.firestore.FieldValue.increment(-entryFee) });
            const afterSnap = await userRef.get();
            const afterData = afterSnap.data();
            socket.emit('update-wallet', { tokens: afterData.mainWallet, score: afterData.weeklyWinnings });

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
            socket.emit('error-msg', 'Kuch galat ho gaya, dobara try karo.');
        }
    });

    // 🔒 Winner Claim System — SECURITY FIXED: ab sirf room ka actual player hi claim kar sakta hai
    socket.on('claim-victory', async (data) => {
        try {
            const room = rooms[data.roomId];
            if (!room || room.type !== 'comp' || !room.active) return;

            // 🔒 CRITICAL CHECK: claim karne wala socket isi room ka player hona chahiye,
            // warna koi bhi bahar wala roomId guess karke prize chura sakta tha!
            const isPlayerInRoom = room.players.some(p => p.id === socket.id);
            if (!isPlayerInRoom) {
                console.log("⚠️ Blocked fraudulent claim-victory attempt from", socket.id);
                return;
            }

            room.active = false; // turant lock karo, double-claim / race condition na ho

            if (!socket.uid) return;

            const userRef = db.collection('users').doc(socket.uid);
            await userRef.update({
                mainWallet: admin.firestore.FieldValue.increment(room.prize),
                weeklyWinnings: admin.firestore.FieldValue.increment(room.prize)
            });
            const snap = await userRef.get();
            const d = snap.data();
            socket.emit('update-wallet', { tokens: d.mainWallet, score: d.weeklyWinnings });

            // Room ke sabhi players ko result batao (winner + losers dono)
            io.to(data.roomId).emit('game-over-broadcast', { winnerId: socket.id, prize: room.prize });
        } catch (e) {
            console.error("claim-victory error:", e);
        }
    });

    // ==========================================
    // 📊 SECTION 4: LEADERBOARD
    // ==========================================
    socket.on('get-leaderboard', async () => {
        try {
            const snap = await db.collection('users').orderBy('weeklyWinnings', 'desc').limit(10).get();
            const leaderboard = snap.docs.map(doc => ({
                name: doc.data().name || 'Player',
                weeklyWinnings: doc.data().weeklyWinnings || 0
            }));
            socket.emit('leaderboard-data', leaderboard);
        } catch (e) {
            console.error("Leaderboard fetch error:", e);
            socket.emit('leaderboard-data', []);
        }
    });

    // ==========================================
    // 🎲 SECTION 5: COMMON GAMEPLAY LOGIC (Dono Modes)
    // ==========================================
    socket.on('roll-dice-action', (data) => socket.to(data.roomId).emit('remote-dice-rolled', data));
    socket.on('move-token-action', (data) => socket.to(data.roomId).emit('remote-token-moved', data));

    socket.on('cancel-action', async () => {
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); // comp queue se hatao + refund do
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); // agar queue mein tha to refund do
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Ludo Master Server running on port ${PORT}`);
});
