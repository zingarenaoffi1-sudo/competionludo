const fs = require("fs");
let code = fs.readFileSync("server.js", "utf8");

// Adding a simple bot auto-play wrapper logic for disconnected players
const disconnectRegex = /socket\.on\('disconnect', async \(\) => \{[\s\S]*?await removeFromCompQueues\(socket, true\); \n    \}\);/;
const newDisconnect = `socket.on('disconnect', async () => {
        socketActionTimestamps.delete(socket.id);
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); 
        
        // Notify others if in a room to handle auto-bot
        for(let roomId in activeRooms) {
            let room = activeRooms[roomId];
            let pIndex = room.players.findIndex(p => p.id === socket.id);
            if(pIndex !== -1) {
                // Keep player in room, but mark disconnected
                io.to(roomId).emit('playerDisconnected', { color: room.players[pIndex].color, msg: 'Player disconnected. Bot taking over soon...' });
                // Note: True Reconnect involves session tokens which requires full DB schema rewrite.
                // For now, we emit this so clients can activate local bot logic for that color if needed.
            }
        }
    });`;
code = code.replace(disconnectRegex, newDisconnect);
fs.writeFileSync("server.js", code);
