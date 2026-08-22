const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

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
// 🗄️ STATE MANAGEMENT (Dono Modes Ke Liye)
// ==========================================
// 1. Free Mode Queue (Purana)
let waitingPlayers = { 2: [], 3: [], 4: [] }; 

// 2. Competitive Mode Queue (Entry Fee Ke Hisaab Se)
let compQueue = { 100: [], 500: [] }; 

let rooms = {};

// 3. Mock Database (Firebase lagne tak Token yahin save honge)
let playersDB = {}; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Jab player aaye, usko competitive mode ke liye default 500 tokens de do
    playersDB[socket.id] = { tokens: 500, score: 0 };
    socket.emit('update-wallet', playersDB[socket.id]);

    // ==========================================
    // 🆓 SECTION A: NORMAL / FREE MULTIPLAYER (Purana Logic)
    // ==========================================
    
    // 1. Quick Match (Free)
    socket.on('find-match', (data) => {
        const reqPlayers = data.playersRequired;
        if(!waitingPlayers[reqPlayers]) waitingPlayers[reqPlayers] = [];
        
        const isAlreadyWaiting = waitingPlayers[reqPlayers].some(s => s.id === socket.id);
        if (!isAlreadyWaiting) {
            waitingPlayers[reqPlayers].push(socket);
        }
        
        if(waitingPlayers[reqPlayers].length === reqPlayers) {
            const roomId = 'FREE_' + Math.random().toString(36).substr(2, 6);
            const players = waitingPlayers[reqPlayers];
            waitingPlayers[reqPlayers] = []; // Queue Reset
            
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

    // 2. Private Room Create & Join (Free)
    socket.on('create-room', (data) => {
        const roomId = 'PRIVATE_' + Math.random().toString(36).substr(2, 6);
        socket.join(roomId);
        socket.emit('room-created', { roomId: roomId, color: 'red' });
        rooms[roomId] = { type: 'free', max: data.maxPlayers, players: [{id: socket.id, color: 'red'}], started: false };
    });

    socket.on('join-room', (data) => {
        const roomId = data.roomId;
        const room = rooms[roomId];
        if(room && !room.started) {
            const colors = ['red', 'green', 'yellow', 'blue'];
            const pColor = colors[room.players.length];
            room.players.push({id: socket.id, color: pColor});
            socket.join(roomId);
            socket.emit('joined-success', { roomId: roomId, color: pColor });
            
            if(room.players.length === room.max) {
                room.started = true;
                io.to(roomId).emit('start-online-game', { players: room.players, mode: 'free' });
            }
        } else {
            socket.emit('error-msg', 'Room not found or already full!');
        }
    });


    // ==========================================
    // 🏆 SECTION B: COMPETITIVE PRO MULTIPLAYER (Naya Logic)
    // ==========================================
    
    // 1. Pro Matchmaking (Tokens katenge yahan)
    socket.on('find-comp-match', (data) => {
        const entryFee = data.entryFee;
        const player = playersDB[socket.id];

        // A. Security Check
        if (player.tokens < entryFee) {
            socket.emit('error-msg', "Not enough tokens to join this Pro Match!");
            return;
        }

        // B. Paise Kaato
        player.tokens -= entryFee;
        socket.emit('update-wallet', player); // Frontend UI update karo
        
        // C. Pro Queue Mein Daalo
        if(!compQueue[entryFee]) compQueue[entryFee] = [];
        const isAlreadyWaiting = compQueue[entryFee].some(s => s.id === socket.id);
        if (!isAlreadyWaiting) compQueue[entryFee].push(socket);

        // D. Match Start Logic (Abhi 2 players par set hai)
        if (compQueue[entryFee].length === 2) {
            const roomId = 'COMP_' + Math.random().toString(36).substr(2, 6);
            const p1 = compQueue[entryFee][0];
            const p2 = compQueue[entryFee][1];
            compQueue[entryFee] = []; // Queue Reset

            const roomData = [
                { id: p1.id, color: 'red' },
                { id: p2.id, color: 'green' }
            ];

            p1.join(roomId);
            p2.join(roomId);
            
            // Prize Economy System
            let winAmount = entryFee === 100 ? 200 : 1000;
            let leaderPoints = entryFee === 100 ? 100 : 500;
            
            rooms[roomId] = { 
                type: 'comp', 
                players: roomData, 
                prize: winAmount, 
                points: leaderPoints, 
                active: true 
            };

            io.to(roomId).emit('start-online-game', { players: roomData, roomId: roomId, mode: 'comp' });
        }
    });

    // 2. Winner Claim System (Sirf Comp mode ke liye)
    socket.on('claim-victory', (data) => {
        const room = rooms[data.roomId];
        // Ensure room exists, is competitive, and payout hasn't happened yet
        if (room && room.type === 'comp' && room.active) {
            const winnerData = playersDB[socket.id];
            if (winnerData) {
                winnerData.tokens += room.prize;
                winnerData.score += room.points;
                socket.emit('update-wallet', winnerData); // Wallet badha do
            }
            room.active = false; // Fraud roko, dobara claim na ho sake
        }
    });


    // ==========================================
    // 🎲 SECTION C: COMMON GAMEPLAY LOGIC (Dono Modes)
    // ==========================================
    
    // Board aur Gotiyon ke moves dono modes mein same tarike se sync honge
    socket.on('roll-dice-action', (data) => socket.to(data.roomId).emit('remote-dice-rolled', data));
    socket.on('move-token-action', (data) => socket.to(data.roomId).emit('remote-token-moved', data));

    // Cancel Button logic (Dono queues se hatao)
    socket.on('cancel-action', () => {
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        for (let fee in compQueue) {
            compQueue[fee] = compQueue[fee].filter(s => s.id !== socket.id);
        }
    });

    // Disconnect Cleanup
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete playersDB[socket.id]; // Memory free
        
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        for (let fee in compQueue) {
            compQueue[fee] = compQueue[fee].filter(s => s.id !== socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Ludo Master Server running on port ${PORT}`);
});
