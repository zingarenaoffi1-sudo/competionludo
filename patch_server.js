const fs = require("fs");
let code = fs.readFileSync("server.js", "utf8");
const disconnectRegex = /socket\.on\('disconnect', async \(\) => \{[\s\S]*?await removeFromCompQueues\(socket, true\); \n    \}\);/;
const newDisconnect = `socket.on('disconnect', async () => {
        socketActionTimestamps.delete(socket.id);
        for (let size in waitingPlayers) {
            waitingPlayers[size] = waitingPlayers[size].filter(s => s.id !== socket.id);
        }
        await removeFromCompQueues(socket, true); 
        for(let roomId in activeRooms) {
            let room = activeRooms[roomId];
            let pIndex = room.players.findIndex(p => p.id === socket.id);
            if(pIndex !== -1) {
                io.to(roomId).emit('playerDisconnected', { color: room.players[pIndex].color, msg: 'Player disconnected. Bot taking over soon...' });
            }
        }
    });`;
code = code.replace(disconnectRegex, newDisconnect);
fs.writeFileSync("server.js", code);
