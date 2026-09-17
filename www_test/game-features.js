// =============================================================================
// ZINGARENA LUDO PRO EXTENDED FEATURES ENGINE
// Features: Match History (Max 5), Daily Lucky Spin Wheel,
// WebRTC Voice Chat (Mic toggle), In-game Chat & Throwable Emojis
// =============================================================================

const ZingFeatures = (function () {
    const STUN_SERVERS = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // -------------------------------------------------------------
    // 1. MATCH HISTORY SYSTEM (MAX 5 MATCHES)
    // -------------------------------------------------------------
    function recordLocalMatch(record) {
        try {
            let history = JSON.parse(localStorage.getItem('zing_match_history') || '[]');
            const entry = {
                id: 'M_' + Date.now(),
                mode: record.mode || 'Classic Ludo',
                result: record.result || 'WIN', // 'WIN' or 'LOSS'
                score: record.score || '+100',
                date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                players: record.players || 2
            };
            history.unshift(entry);
            // Strict MAX 5 limit as requested by user
            if (history.length > 5) {
                history = history.slice(0, 5);
            }
            localStorage.setItem('zing_match_history', JSON.stringify(history));
        } catch (e) {
            console.warn("Match history save notice:", e);
        }
    }

    function getLocalMatchHistory() {
        try {
            let history = JSON.parse(localStorage.getItem('zing_match_history') || '[]');
            return history.slice(0, 5);
        } catch (e) {
            return [];
        }
    }

    function showMatchHistoryModal(serverHistory) {
        let history = serverHistory && serverHistory.length > 0 ? serverHistory.slice(0, 5) : getLocalMatchHistory();

        let modal = document.getElementById('match-history-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'match-history-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        let contentHtml = `
            <div class="modal-content" style="max-width: 380px; text-align: left; padding: 20px; border-radius: 16px; border: 2px solid #ffd700; background: linear-gradient(180deg, #1e293b, #0f172a); box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <h3 style="color: #ffd700; font-size: 16px; margin: 0; font-weight: 900; display: flex; align-items: center; gap: 6px;">
                        <span>📜</span> MATCH HISTORY (LAST 5)
                    </h3>
                    <button onclick="ZingFeatures.closeMatchHistoryModal()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>
        `;

        if (!history || history.length === 0) {
            contentHtml += `
                <div style="text-align: center; padding: 30px 10px; color: #94a3b8; font-size: 13px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🎲</div>
                    No matches played yet.<br>Play a match to see your history!
                </div>
            `;
        } else {
            contentHtml += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
            history.forEach((m, idx) => {
                const isWin = (m.result === 'WIN');
                const badgeColor = isWin ? '#10b981' : '#ef4444';
                const badgeText = isWin ? '🏆 VICTORY' : '❌ DEFEAT';
                const dateStr = m.date || m.dateStr || 'Recent';
                const modeStr = m.mode || 'Classic Match';
                const prizeStr = m.prize ? `+${m.prize} Tokens` : (m.score || (isWin ? '+Win' : '-Loss'));

                contentHtml += `
                    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 800; font-size: 13px; color: #f8fafc;">${modeStr}</div>
                            <div style="font-size: 10px; color: #94a3b8;">${dateStr}</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 11px; font-weight: 800; color: ${badgeColor}; display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.3);">${badgeText}</span>
                            <div style="font-size: 11px; font-weight: 700; color: #ffd700; margin-top: 2px;">${prizeStr}</div>
                        </div>
                    </div>
                `;
            });
            contentHtml += `</div>`;
        }

        contentHtml += `
                <button class="ultra-roll-btn" onclick="ZingFeatures.closeMatchHistoryModal()" style="width: 100%; margin-top: 16px; padding: 10px; border-radius: 10px;">Close</button>
            </div>
        `;

        modal.innerHTML = contentHtml;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function closeMatchHistoryModal() {
        const modal = document.getElementById('match-history-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    // -------------------------------------------------------------
    // 2. DAILY LUCKY SPIN WHEEL (WITH AUDIO & 24H COOLDOWN)
    // -------------------------------------------------------------
    const WHEEL_REWARDS = [50, 100, 150, 200, 250, 500, 750, 1000];
    const WHEEL_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308'];

    let isSpinning = false;
    let spinWheelAngle = 0;

    function getSpinCooldownRemaining() {
        try {
            const last = parseInt(localStorage.getItem('zing_last_spin_time') || '0', 10);
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            if (now - last < cooldown) {
                return cooldown - (now - last);
            }
            return 0;
        } catch (e) {
            return 0;
        }
    }

    function formatTime(ms) {
        let totalSec = Math.floor(ms / 1000);
        let hrs = Math.floor(totalSec / 3600);
        let mins = Math.floor((totalSec % 3600) / 60);
        let secs = totalSec % 60;
        return `${hrs}h ${mins}m ${secs}s`;
    }

    function showDailySpinModal(socket) {
        let modal = document.getElementById('daily-spin-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'daily-spin-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const remaining = getSpinCooldownRemaining();

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 380px; text-align: center; padding: 20px; border-radius: 16px; border: 2px solid #ffd700; background: linear-gradient(180deg, #1e293b, #0f172a); box-shadow: 0 20px 40px rgba(0,0,0,0.8); position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <h3 style="color: #ffd700; font-size: 17px; margin: 0; font-weight: 900; letter-spacing: 0.5px;">
                        🎡 DAILY LUCKY SPIN
                    </h3>
                    <button onclick="ZingFeatures.closeDailySpinModal()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 12px;">Spin once every 24 hours to win free Zing Competition Tokens!</p>

                <div style="position: relative; width: 240px; height: 240px; margin: 0 auto;">
                    <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 22px solid #ffd700; z-index: 10; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8));"></div>
                    <canvas id="wheel-canvas" width="240" height="240" style="width: 240px; height: 240px; border-radius: 50%; box-shadow: 0 0 20px rgba(255,215,0,0.4), 0 8px 15px rgba(0,0,0,0.8); border: 4px solid #ffd700;"></canvas>
                </div>

                <div id="spin-timer-box" style="margin-top: 14px; font-size: 13px; font-weight: 700; color: #ffd700; background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,215,0,0.2);">
                    ${remaining > 0 ? `⏳ Next Free Spin in: <span id="spin-countdown" style="color: #f59e0b; font-weight: 800;">${formatTime(remaining)}</span>` : '✨ Free Spin Ready to Claim!'}
                </div>

                <button id="spin-btn" class="ultra-roll-btn" style="width: 100%; margin-top: 14px; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 900; ${remaining > 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    ${remaining > 0 ? 'COOLDOWN ACTIVE' : 'SPIN NOW 🎲'}
                </button>

                <button onclick="ZingFeatures.closeDailySpinModal()" class="menu-btn" style="width: 100%; margin-top: 10px; padding: 10px; border-radius: 10px;">
                    Close
                </button>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        drawWheelCanvas();

        const spinBtn = document.getElementById('spin-btn');
        if (remaining > 0) {
            spinBtn.disabled = true;
            startCountdownTimer();
        } else {
            spinBtn.onclick = () => performSpin(socket);
        }
    }

    function closeDailySpinModal() {
        if (countdownInterval) clearInterval(countdownInterval);
        const modal = document.getElementById('daily-spin-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    let countdownInterval = null;
    function startCountdownTimer() {
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            const rem = getSpinCooldownRemaining();
            const cdEl = document.getElementById('spin-countdown');
            if (rem <= 0) {
                clearInterval(countdownInterval);
                const timerBox = document.getElementById('spin-timer-box');
                const spinBtn = document.getElementById('spin-btn');
                if (timerBox) timerBox.innerHTML = '✨ Free Spin Available!';
                if (spinBtn) {
                    spinBtn.disabled = false;
                    spinBtn.style.opacity = '1';
                    spinBtn.style.cursor = 'pointer';
                    spinBtn.onclick = () => performSpin();
                }
            } else if (cdEl) {
                cdEl.innerText = formatTime(rem);
            }
        }, 1000);
    }

    function drawWheelCanvas() {
        const canvas = document.getElementById('wheel-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const numSlices = WHEEL_REWARDS.length;
        const sliceAngle = (2 * Math.PI) / numSlices;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = centerX - 4;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(spinWheelAngle);

        for (let i = 0; i < numSlices; i++) {
            const startA = i * sliceAngle;
            const endA = startA + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startA, endA);
            ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Text
            ctx.save();
            ctx.rotate(startA + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillText(`${WHEEL_REWARDS[i]} 🪙`, radius - 15, 5);
            ctx.restore();
        }

        // Center peg
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, 2 * Math.PI);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }

    function performSpin(socket) {
        if (isSpinning) return;
        if (getSpinCooldownRemaining() > 0) return;

        isSpinning = true;
        const spinBtn = document.getElementById('spin-btn');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerText = 'SPINNING...';
        }

        // Selected prize index
        const prizeIdx = Math.floor(Math.random() * WHEEL_REWARDS.length);
        const reward = WHEEL_REWARDS[prizeIdx];

        // Animate wheel: 5 to 7 full rotations + sector angle
        const sliceAngle = (2 * Math.PI) / WHEEL_REWARDS.length;
        // Pointer is at TOP (-PI/2). To align slice under pointer:
        const targetAngle = (3 * Math.PI / 2) - (prizeIdx * sliceAngle + sliceAngle / 2);
        const totalRotations = 6 * (2 * Math.PI);
        const finalAngle = spinWheelAngle + totalRotations + (targetAngle - (spinWheelAngle % (2 * Math.PI)));

        const startTime = Date.now();
        const duration = 4000;
        const startA = spinWheelAngle;

        const animInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            spinWheelAngle = startA + (finalAngle - startA) * ease;
            drawWheelCanvas();

            if (progress >= 1) {
                clearInterval(animInterval);
                isSpinning = false;
                localStorage.setItem('zing_last_spin_time', Date.now().toString());

                // Credit token reward in local wallet
                let curTokens = parseInt(localStorage.getItem('zing_tokens') || '1000', 10);
                curTokens += reward;
                localStorage.setItem('zing_tokens', curTokens.toString());

                // If socket provided, notify server
                if (socket) {
                    socket.emit('claim-daily-spin');
                }

                recordLocalMatch({
                    mode: 'Daily Lucky Spin',
                    result: 'WIN',
                    score: `+${reward} Tokens`,
                    players: 1
                });

                showSpinRewardAlert(reward);
            }
        }, 16);
    }

    function showSpinRewardAlert(reward) {
        const timerBox = document.getElementById('spin-timer-box');
        const spinBtn = document.getElementById('spin-btn');
        if (timerBox) {
            timerBox.innerHTML = `🎉 <span style="color: #10b981; font-size: 15px;">Won +${reward} Free Tokens!</span>`;
        }
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerText = 'CLAIMED!';
            spinBtn.style.opacity = '0.5';
        }

        // Global balance updates
        const walletEl = document.getElementById('user-wallet-tokens') || document.getElementById('wallet-tokens');
        if (walletEl) {
            const cur = parseInt(walletEl.innerText.replace(/[^0-9]/g, '') || '0', 10) + reward;
            walletEl.innerText = cur.toLocaleString();
        }
    }

    // -------------------------------------------------------------
    // 3. WEBRTC REAL-TIME VOICE CHAT (MIC TOGGLE WITH GOOGLE STUN)
    // -------------------------------------------------------------
    let localAudioStream = null;
    let peerConnections = {}; // targetSocketId -> RTCPeerConnection
    let isMicActive = false;

    function initVoiceChat(socket, roomId, myAssignedColor) {
        if (!socket || !roomId) return;

        // Listen for peer join event
        socket.on('voice-peer-joined', async (data) => {
            if (isMicActive && localAudioStream) {
                createPeerConnection(socket, roomId, data.peerId, true);
            }
        });

        // Listen for WebRTC signals
        socket.on('voice-signal', async (data) => {
            const peerId = data.senderId;
            const signal = data.signal;

            if (!peerConnections[peerId]) {
                createPeerConnection(socket, roomId, peerId, false);
            }

            const pc = peerConnections[peerId];
            if (signal.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                if (signal.sdp.type === 'offer') {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('voice-signal', {
                        targetId: peerId,
                        signal: { sdp: pc.localDescription }
                    });
                }
            } else if (signal.candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (e) {}
            }
        });

        socket.on('voice-peer-left', (data) => {
            if (peerConnections[data.peerId]) {
                peerConnections[data.peerId].close();
                delete peerConnections[data.peerId];
            }
        });
    }

    function createPeerConnection(socket, roomId, targetId, isInitiator) {
        const pc = new RTCPeerConnection(STUN_SERVERS);
        peerConnections[targetId] = pc;

        if (localAudioStream) {
            localAudioStream.getTracks().forEach(track => {
                pc.addTrack(track, localAudioStream);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('voice-signal', {
                    targetId: targetId,
                    signal: { candidate: event.candidate }
                });
            }
        };

        pc.ontrack = (event) => {
            let audioEl = document.getElementById(`audio-peer-${targetId}`);
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.id = `audio-peer-${targetId}`;
                audioEl.autoplay = true;
                document.body.appendChild(audioEl);
            }
            audioEl.srcObject = event.streams[0];
        };

        if (isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('voice-signal', {
                        targetId: targetId,
                        signal: { sdp: pc.localDescription }
                    });
                } catch (e) {}
            };
        }

        return pc;
    }

    async function toggleMicrophone(socket, roomId, btnEl) {
        if (!isMicActive) {
            try {
                localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                isMicActive = true;
                if (btnEl) {
                    btnEl.innerHTML = '🎙️ Live';
                    btnEl.style.background = '#10b981';
                    btnEl.style.color = '#ffffff';
                }
                socket.emit('voice-join-room', { roomId });
            } catch (err) {
                alert('Microphone permission required for Voice Chat! Please allow mic access in your browser settings.');
                console.warn("Microphone access error:", err);
            }
        } else {
            // Mute / Stop mic
            if (localAudioStream) {
                localAudioStream.getTracks().forEach(t => t.stop());
                localAudioStream = null;
            }
            isMicActive = false;
            for (let id in peerConnections) {
                peerConnections[id].close();
            }
            peerConnections = {};

            if (btnEl) {
                btnEl.innerHTML = '🎙️ Muted';
                btnEl.style.background = 'rgba(239, 68, 68, 0.2)';
                btnEl.style.color = '#ef4444';
            }
            socket.emit('voice-leave-room', { roomId });
        }
    }

    // -------------------------------------------------------------
    // 4. IN-GAME QUICK CHAT & THROWABLE EMOJIS
    // -------------------------------------------------------------
    const CHAT_QUICK_PHRASES = [
        "Good luck! 🍀",
        "Well played! 👏",
        "Hurry up! ⏰",
        "Nice move! 🔥",
        "Oops! 😅",
        "Thanks! 🙏"
    ];

    const THROWABLE_EMOJIS = ["🍅", "🥚", "😡", "😂", "❤️", "💣"];

    function initInGameChat(socket, roomId) {
        if (!socket || !roomId) return;

        socket.on('player-chat-emoji', (data) => {
            if (data.type === 'text') {
                showSpeechBubble(data.senderColor, data.content);
            } else if (data.type === 'emoji') {
                showThrownEmoji(data.senderColor, data.targetColor, data.content);
            }
        });
    }

    function showSpeechBubble(color, text) {
        const profile = document.getElementById(`profile-${color}`) || document.getElementById(`corner-${color}`);
        if (!profile) return;

        const bubble = document.createElement('div');
        bubble.className = 'chat-speech-bubble';
        bubble.innerText = text;
        profile.style.position = 'relative';
        profile.appendChild(bubble);

        setTimeout(() => {
            if (bubble.parentElement) bubble.remove();
        }, 3000);
    }

    function showThrownEmoji(fromColor, toColor, emoji) {
        const fromEl = document.getElementById(`profile-${fromColor}`) || document.getElementById(`corner-${fromColor}`);
        const toEl = (toColor && document.getElementById(`profile-${toColor}`)) || fromEl;

        const flyer = document.createElement('div');
        flyer.className = 'throwable-emoji-flyer';
        flyer.innerText = emoji;

        const startRect = fromEl ? fromEl.getBoundingClientRect() : { left: 100, top: 100 };
        const endRect = toEl ? toEl.getBoundingClientRect() : { left: 200, top: 200 };

        flyer.style.left = `${startRect.left + 15}px`;
        flyer.style.top = `${startRect.top + 15}px`;
        document.body.appendChild(flyer);

        requestAnimationFrame(() => {
            flyer.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            flyer.style.left = `${endRect.left + 15}px`;
            flyer.style.top = `${endRect.top + 15}px`;
            flyer.style.transform = 'scale(1.6) rotate(360deg)';
        });

        setTimeout(() => {
            flyer.remove();
            // Splat impact vibration on target
            if (toEl) {
                toEl.classList.add('emoji-impact-shake');
                setTimeout(() => toEl.classList.remove('emoji-impact-shake'), 400);
            }
        }, 650);
    }

    function openChatPicker(socket, roomId, myColor, activeColors) {
        let picker = document.getElementById('in-game-chat-picker');
        if (!picker) {
            picker = document.createElement('div');
            picker.id = 'in-game-chat-picker';
            picker.className = 'chat-picker-modal';
            document.body.appendChild(picker);
        }

        let opponents = (activeColors || ['red', 'green', 'yellow', 'blue']).filter(c => c !== myColor);

        let html = `
            <div class="chat-picker-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 12px; font-weight: 800; color: #ffd700;">💬 QUICK CHAT</span>
                    <button class="banner-close-btn" onclick="document.getElementById('in-game-chat-picker').classList.add('hidden')">✕</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
                    ${CHAT_QUICK_PHRASES.map(phrase => `
                        <button class="chat-phrase-btn" onclick="ZingFeatures.sendChatPhrase('${phrase}')">${phrase}</button>
                    `).join('')}
                </div>

                <div style="font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
                    THROW EMOJI ON OPPONENT:
                </div>
                <div style="display: flex; justify-content: space-around; font-size: 24px;">
                    ${THROWABLE_EMOJIS.map(emoji => `
                        <span class="throw-emoji-btn" onclick="ZingFeatures.sendThrownEmoji('${emoji}')">${emoji}</span>
                    `).join('')}
                </div>
            </div>
        `;

        picker.innerHTML = html;
        picker.classList.remove('hidden');

        // Store active session variables for sending
        picker.dataset.roomId = roomId;
        picker.dataset.myColor = myColor;
        picker.dataset.targetColor = opponents[0] || 'green';
    }

    function sendChatPhrase(phrase) {
        const picker = document.getElementById('in-game-chat-picker');
        if (!picker) return;
        const roomId = picker.dataset.roomId;
        if (window.socket) {
            window.socket.emit('room-chat-emoji', {
                roomId: roomId,
                type: 'text',
                content: phrase
            });
        }
        picker.classList.add('hidden');
    }

    function sendThrownEmoji(emoji) {
        const picker = document.getElementById('in-game-chat-picker');
        if (!picker) return;
        const roomId = picker.dataset.roomId;
        const targetColor = picker.dataset.targetColor;
        if (window.socket) {
            window.socket.emit('room-chat-emoji', {
                roomId: roomId,
                type: 'emoji',
                content: emoji,
                targetColor: targetColor
            });
        }
        picker.classList.add('hidden');
    }

    return {
        recordLocalMatch,
        getLocalMatchHistory,
        showMatchHistoryModal,
        closeMatchHistoryModal,
        showDailySpinModal,
        closeDailySpinModal,
        getSpinCooldownRemaining,
        initVoiceChat,
        toggleMicrophone,
        initInGameChat,
        openChatPicker,
        sendChatPhrase,
        sendThrownEmoji
    };
})();

window.ZingFeatures = ZingFeatures;
