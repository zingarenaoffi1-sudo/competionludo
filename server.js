// YEH HAI SECURE COMPETITION BACKEND
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => res.send('ZingArena Server is Awake!'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// 🔥 MOCK DATABASE (Firebase lagne tak data yahan save hoga)
let playersDB = {}; // format: { socketId: { tokens: 500, score: 0 } }

let compQueue = { 100: [], 500: [] }; // Alag-alag entry fee ki queue
let rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Naya player aate hi usko 500 free token de do (Testing ke liye)
    playersDB[socket.id] = { tokens: 500, score: 0 };
    socket.emit('update-wallet', playersDB[socket.id]); // Frontend ko balance bhejo

    // ==========================================
    // 🛡️ SECURE MATCHMAKING & ECONOMY
    // ==========================================
    socket.on('find-comp-match', (data) => {
        const entryFee = data.entryFee;
        const player = playersDB[socket.id];

        // 1. HACKER CHECK: Kya iske paas sach mein paise hain?
        if (player.tokens < entryFee) {
            socket.emit('error-msg', "Not enough tokens! Hacker banne ki koshish mat kar! 😂");
            return;
        }

        // 2. PAISA KAATO: Server ne paise kaat liye
        player.tokens -= entryFee;
        socket.emit('update-wallet', player); // Naya balance bhejo
        
        // 3. Queue mein daalo
        const isAlreadyWaiting = compQueue[entryFee].some(s => s.id === socket.id);
        if (!isAlreadyWaiting) compQueue[entryFee].push(socket);

        // 4. Match Start Logic (2 players for testing)
        if (compQueue[entryFee].length === 2) {
            const roomId = 'COMP_' + Math.random().toString(36).substr(2, 6);
            const p1 = compQueue[entryFee][0];
            const p2 = compQueue[entryFee][1];
            compQueue[entryFee] = []; // Reset queue

            const roomData = [
                { id: p1.id, color: 'red' },
                { id: p2.id, color: 'green' }
            ];

            p1.join(roomId);
            p2.join(roomId);
            
            // Room me prize pool save karo taaki hacking na ho
            let winAmount = entryFee === 100 ? 200 : 1000;
            let leaderPoints = entryFee === 100 ? 100 : 500;
            
            rooms[roomId] = { players: roomData, prize: winAmount, points: leaderPoints, active: true };

            io.to(roomId).emit('start-online-game', { players: roomData, roomId: roomId });
        }
    });

    // ==========================================
    // 🏆 SECURE WINNER PAYOUT
    // ==========================================
    socket.on('claim-victory', (data) => {
        const room = rooms[data.roomId];
        // Check karo ki room exist karta hai aur match active tha
        if (room && room.active) {
            const winnerData = playersDB[socket.id];
            
            // Server khud decide karke paise dega
            winnerData.tokens += room.prize;
            winnerData.score += room.points;
            
            socket.emit('update-wallet', winnerData);
            room.active = false; // Match khatam, taaki dobara claim na kar sake
            
            io.to(data.roomId).emit('game-over-broadcast', { winnerId: socket.id, prize: room.prize });
        }
    });

    // Baaki purana Ludo Board ka logic (roll-dice, move-token) same rahega
    socket.on('roll-dice-action', (data) => socket.to(data.roomId).emit('remote-dice-rolled', data));
    socket.on('move-token-action', (data) => socket.to(data.roomId).emit('remote-token-moved', data));

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete playersDB[socket.id]; // Memory clean
        for (let fee in compQueue) {
            compQueue[fee] = compQueue[fee].filter(s => s.id !== socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Secure Server running on port ${PORT}`));
