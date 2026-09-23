// Ludo King Style In-Game Bottom Bar, Hamburger Menu, Mic & Quick Chat System
// Gives players full-screen immersion with bottom 3-lines menu (☰), audio controls, and chat/mic features.

window.LudoKingMenu = (function () {
    let _mode = 'bot'; // 'bot', 'online', 'competition', 'local'
    let _soundMuted = false;

    function init(options = {}) {
        _mode = options.mode || 'bot';
        injectBottomBar();
        injectMenuModal();
        injectChatModal();
        updateAudioButtonStates();
    }

    function injectBottomBar() {
        if (document.getElementById('ludo-king-bottom-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'ludo-king-bottom-bar';
        bar.className = 'ludo-king-bottom-bar';
        bar.innerHTML = `
            <button class="lk-bar-btn lk-menu-trigger" id="lk-menu-btn" title="Game Menu" onclick="LudoKingMenu.openMenu()">
                <div class="lk-hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>
            <div class="lk-center-pill" id="lk-status-pill">
                <span id="lk-status-title">YOUR TURN</span>
                <span id="lk-status-sub">Tap dice to roll</span>
            </div>
            <div class="lk-right-actions">
                <button class="lk-bar-btn" id="lk-chat-btn" title="Quick Chat" onclick="LudoKingMenu.openChat()">
                    💬
                </button>
                <button class="lk-bar-btn" id="lk-mic-btn" title="Voice Mic" onclick="LudoKingMenu.toggleMic()">
                    🎙️
                </button>
            </div>
        `;
        document.body.appendChild(bar);
    }

    function injectMenuModal() {
        if (document.getElementById('lk-in-game-menu-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'lk-in-game-menu-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content lk-menu-content">
                <div class="lk-menu-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">👑</span>
                        <h3 style="margin: 0; color: #ffd700; font-size: 18px; font-weight: 900;">GAME MENU</h3>
                    </div>
                    <button class="lk-close-circle" onclick="LudoKingMenu.closeMenu()">✕</button>
                </div>
                <div class="lk-menu-list">
                    <button class="lk-menu-item" id="lk-music-toggle-btn" onclick="LudoKingMenu.toggleMusic()">
                        <span class="lk-item-icon">🎵</span>
                        <div class="lk-item-texts">
                            <div class="lk-item-title">Background Music</div>
                            <div class="lk-item-sub" id="lk-music-status-text">Music ON</div>
                        </div>
                        <span class="lk-item-state" id="lk-music-badge">ON</span>
                    </button>
                    <button class="lk-menu-item" id="lk-sound-toggle-btn" onclick="LudoKingMenu.toggleSound()">
                        <span class="lk-item-icon">🔊</span>
                        <div class="lk-item-texts">
                            <div class="lk-item-title">Sound Effects</div>
                            <div class="lk-item-sub" id="lk-sound-status-text">Dice & token audio</div>
                        </div>
                        <span class="lk-item-state" id="lk-sound-badge">ON</span>
                    </button>
                    <button class="lk-menu-item" onclick="LudoKingMenu.showRules()">
                        <span class="lk-item-icon">📖</span>
                        <div class="lk-item-texts">
                            <div class="lk-item-title">Rules & Guide</div>
                            <div class="lk-item-sub">How to play & token moves</div>
                        </div>
                        <span style="color: #ffd700; font-weight: 800;">❯</span>
                    </button>
                    <button class="lk-menu-item" onclick="LudoKingMenu.restartGame()">
                        <span class="lk-item-icon">🔄</span>
                        <div class="lk-item-texts">
                            <div class="lk-item-title">Restart Match</div>
                            <div class="lk-item-sub">Start fresh with new players</div>
                        </div>
                        <span style="color: #60a5fa; font-weight: 800;">❯</span>
                    </button>
                    <button class="lk-menu-item lk-danger-item" onclick="LudoKingMenu.exitToLobby()">
                        <span class="lk-item-icon">🚪</span>
                        <div class="lk-item-texts">
                            <div class="lk-item-title">Exit to Lobby</div>
                            <div class="lk-item-sub">Leave current match</div>
                        </div>
                        <span style="color: #f87171; font-weight: 800;">❯</span>
                    </button>
                </div>
                <button class="ultra-roll-btn" onclick="LudoKingMenu.closeMenu()" style="width: 100%; margin-top: 14px; min-height: 44px;">
                    RESUME GAME ▶️
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function injectChatModal() {
        if (document.getElementById('lk-chat-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'lk-chat-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content lk-chat-content">
                <div class="lk-menu-header" style="margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 22px;">💬</span>
                        <h3 style="margin: 0; color: #ffd700; font-size: 16px; font-weight: 900;">QUICK CHAT & EMOJIS</h3>
                    </div>
                    <button class="lk-close-circle" onclick="LudoKingMenu.closeChat()">✕</button>
                </div>

                <!-- Custom Short Message Input -->
                <div style="display: flex; gap: 6px; margin-bottom: 12px;">
                    <input type="text" id="lk-custom-msg-input" placeholder="Type a message (e.g. Chalo bhai!)..." 
                        maxlength="40"
                        style="flex: 1; padding: 10px 12px; border-radius: 10px; border: 1px solid #ffd700; background: #0f172a; color: white; font-size: 13px; font-weight: 600;"
                        onkeypress="if(event.key === 'Enter') LudoKingMenu.sendCustomMessage()"
                    />
                    <button class="ultra-roll-btn" onclick="LudoKingMenu.sendCustomMessage()" style="padding: 0 16px; font-size: 13px; min-height: 42px; border-radius: 10px;">
                        Send 🚀
                    </button>
                </div>

                <!-- Fast One-Tap Phrases -->
                <div style="font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 6px; text-align: left;">
                    POPULAR SHOUTS:
                </div>
                <div class="lk-chat-chips-grid">
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Jaldi khelo! ⏰')">Jaldi khelo! ⏰</button>
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Well played! 👏')">Well played! 👏</button>
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Kamaal chaal! 🔥')">Kamaal chaal! 🔥</button>
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Bad luck yaar! 😅')">Bad luck yaar! 😅</button>
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Thank you! 🙏')">Thank you! 🙏</button>
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Good luck! 🍀')">Good luck! 🍀</button>
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Sixer aayega! 🎲')">Sixer aayega! 🎲</button>
                    <button class="lk-chat-chip" onclick="LudoKingMenu.sendPhrase('Oye hoye! 🎉')">Oye hoye! 🎉</button>
                </div>

                <!-- Throw Animated Emojis -->
                <div style="font-size: 11px; font-weight: 800; color: #94a3b8; margin: 10px 0 6px; text-align: left;">
                    REACT WITH EMOJIS:
                </div>
                <div class="lk-emoji-reactions-row">
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('🔥')">🔥</span>
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('😂')">😂</span>
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('❤️')">❤️</span>
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('😡')">😡</span>
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('🍅')">🍅</span>
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('💣')">💣</span>
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('👑')">👑</span>
                    <span class="lk-emoji-btn" onclick="LudoKingMenu.sendEmoji('🎯')">🎯</span>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function openMenu() {
        const m = document.getElementById('lk-in-game-menu-modal');
        if (m) {
            m.classList.remove('hidden');
            m.style.display = 'flex';
        }
    }

    function closeMenu() {
        const m = document.getElementById('lk-in-game-menu-modal');
        if (m) {
            m.classList.add('hidden');
            m.style.display = 'none';
        }
    }

    function openChat() {
        const c = document.getElementById('lk-chat-modal');
        if (c) {
            c.classList.remove('hidden');
            c.style.display = 'flex';
            setTimeout(() => {
                const inp = document.getElementById('lk-custom-msg-input');
                if (inp) inp.focus();
            }, 100);
        }
    }

    function closeChat() {
        const c = document.getElementById('lk-chat-modal');
        if (c) {
            c.classList.add('hidden');
            c.style.display = 'none';
        }
    }

    function sendCustomMessage() {
        const inp = document.getElementById('lk-custom-msg-input');
        if (!inp) return;
        const text = (inp.value || '').trim();
        if (!text) return;
        inp.value = '';
        sendPhrase(text);
    }

    function sendPhrase(phrase) {
        closeChat();
        displayLocalSpeechBubble('red', phrase);

        // 1. Emit via socket if online / competition
        if (window.socket && window.currentOnlineRoomId) {
            window.socket.emit('room-chat-emoji', {
                roomId: window.currentOnlineRoomId,
                type: 'text',
                content: phrase
            });
        }

        // 2. In bot match, bot might realistically reply
        if (_mode === 'bot' || window.isSimulatedOnline) {
            triggerRealisticBotReply();
        }
    }

    function sendEmoji(emoji) {
        closeChat();
        displayLocalSpeechBubble('red', emoji);

        if (window.socket && window.currentOnlineRoomId) {
            window.socket.emit('room-chat-emoji', {
                roomId: window.currentOnlineRoomId,
                type: 'emoji',
                content: emoji
            });
        }

        if (_mode === 'bot' || window.isSimulatedOnline) {
            triggerRealisticBotReply();
        }
    }

    function displayLocalSpeechBubble(color, text) {
        const profile = document.getElementById(`profile-${color}`) || document.getElementById(`corner-${color}`);
        if (!profile) return;

        const bubble = document.createElement('div');
        bubble.className = 'chat-speech-bubble';
        bubble.innerText = text;
        profile.style.position = 'relative';
        profile.appendChild(bubble);

        setTimeout(() => {
            if (bubble.parentElement) bubble.remove();
        }, 2800);
    }

    function triggerRealisticBotReply() {
        if (Math.random() > 0.45) {
            setTimeout(() => {
                const botColors = ['green', 'yellow', 'blue'];
                const randomBot = botColors[Math.floor(Math.random() * botColors.length)];
                if (window.RealisticPersonas) {
                    window.RealisticPersonas.triggerBotChatReaction(randomBot, 'normal');
                } else {
                    const replies = ["Well played! 👏", "Nice move! 🔥", "Oops! 😅", "Good luck! 🍀", "😂", "Thanks! 🙏"];
                    displayLocalSpeechBubble(randomBot, replies[Math.floor(Math.random() * replies.length)]);
                }
            }, 1200 + Math.random() * 800);
        }
    }

    async function toggleMic() {
        const btn = document.getElementById('lk-mic-btn');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alertToast("Microphone is not supported on this browser/device.");
            return;
        }

        // Check if mic is already active
        if (window._isVoiceMicLive) {
            if (window._liveAudioStream) {
                window._liveAudioStream.getTracks().forEach(t => t.stop());
                window._liveAudioStream = null;
            }
            window._isVoiceMicLive = false;
            if (btn) {
                btn.innerHTML = '🎙️';
                btn.style.background = '';
                btn.style.color = '';
            }
            alertToast("Microphone Muted 🔇");
            return;
        }

        try {
            alertToast("Requesting microphone permission...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            window._liveAudioStream = stream;
            window._isVoiceMicLive = true;
            if (btn) {
                btn.innerHTML = '🔴 Live';
                btn.style.background = '#10b981';
                btn.style.color = '#ffffff';
            }
            alertToast("Microphone Connected! 🎙️ Speaking live");
            
            if (window.ZingFeatures && window.socket && window.currentOnlineRoomId) {
                window.socket.emit('voice-join-room', { roomId: window.currentOnlineRoomId });
            }
        } catch (err) {
            console.warn("Microphone access error:", err);
            alertToast("⚠️ Microphone permission denied or blocked. Please allow mic in settings.");
        }
    }

    function alertToast(msg) {
        if (typeof showToast === 'function') {
            showToast(msg);
        } else if (typeof showAdToast === 'function') {
            showAdToast(msg);
        } else {
            console.log(msg);
        }
    }

    function toggleMusic() {
        if (window.LudoMusic) {
            const isMuted = LudoMusic.toggleMute();
            updateAudioButtonStates();
        }
    }

    function toggleSound() {
        _soundMuted = !_soundMuted;
        updateAudioButtonStates();
        alertToast(_soundMuted ? "Sound Effects Muted 🔇" : "Sound Effects ON 🔊");
    }

    function updateAudioButtonStates() {
        const isMusicMuted = window.LudoMusic ? LudoMusic.isMuted() : false;
        
        const mBadge = document.getElementById('lk-music-badge');
        const mSub = document.getElementById('lk-music-status-text');
        if (mBadge) mBadge.innerText = isMusicMuted ? 'OFF' : 'ON';
        if (mBadge) mBadge.style.color = isMusicMuted ? '#ef4444' : '#10b981';
        if (mSub) mSub.innerText = isMusicMuted ? 'Music paused' : 'Playing soundtrack';

        const sBadge = document.getElementById('lk-sound-badge');
        const sSub = document.getElementById('lk-sound-status-text');
        if (sBadge) sBadge.innerText = _soundMuted ? 'OFF' : 'ON';
        if (sBadge) sBadge.style.color = _soundMuted ? '#ef4444' : '#10b981';
        if (sSub) sSub.innerText = _soundMuted ? 'Effects muted' : 'Dice & token audio active';
    }

    function showRules() {
        closeMenu();
        if (window.HowToPlayGuide && typeof HowToPlayGuide.openModal === 'function') {
            HowToPlayGuide.openModal();
        }
    }

    function restartGame() {
        closeMenu();
        if (confirm("Are you sure you want to restart the match?")) {
            window.location.reload();
        }
    }

    function exitToLobby() {
        closeMenu();
        if (window.LudoBackHandler && typeof LudoBackHandler.handleBackPress === 'function') {
            LudoBackHandler.handleBackPress();
        } else {
            window.location.href = 'index.html';
        }
    }

    function updateTurnPill(playerName, statusText, isMyTurn = false) {
        const titleEl = document.getElementById('lk-status-title');
        const subEl = document.getElementById('lk-status-sub');
        const pill = document.getElementById('lk-status-pill');

        if (titleEl) titleEl.innerText = playerName ? playerName.toUpperCase() : "YOUR TURN";
        if (subEl) subEl.innerText = statusText || "Roll the dice";

        if (pill) {
            if (isMyTurn) {
                pill.classList.add('lk-my-turn-pulse');
            } else {
                pill.classList.remove('lk-my-turn-pulse');
            }
        }
    }

    return {
        init,
        openMenu,
        closeMenu,
        openChat,
        closeChat,
        sendCustomMessage,
        sendPhrase,
        sendEmoji,
        toggleMic,
        toggleMusic,
        toggleSound,
        showRules,
        restartGame,
        exitToLobby,
        updateTurnPill,
        displayLocalSpeechBubble
    };
})();
