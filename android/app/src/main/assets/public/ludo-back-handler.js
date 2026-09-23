// ludo-back-handler.js - Unified Hardware & Navigation Back Handler
// Handles Android hardware back button, web back navigation, and desktop Escape key.

const LudoBackHandler = (function () {
    let currentMode = 'dashboard'; // 'dashboard' | 'match' | 'competition'
    let isModalOpen = false;

    function init(options) {
        currentMode = (options && options.mode) || 'dashboard';

        // 1. Capacitor Native Android Hardware Back Button
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            try {
                window.Capacitor.Plugins.App.addListener('backButton', function () {
                    handleBackPress();
                });
            } catch (e) {}
        }

        // 2. Browser / Android WebView History Back (popstate)
        try {
            history.pushState({ ludoNav: true }, '', window.location.href);
            window.addEventListener('popstate', function () {
                history.pushState({ ludoNav: true }, '', window.location.href);
                handleBackPress();
            });
        } catch (e) {}

        // 3. Desktop Keyboard Escape Key
        window.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                handleBackPress();
            }
        });
    }

    function handleBackPress() {
        // Priority 1: Dismiss any active gameplay overlay modals first
        const auxiliaryModalIds = [
            'how-to-play-modal',
            'match-history-modal',
            'throwable-emojis-modal',
            'voice-chat-modal',
            'custom-room-modal',
            'share-room-modal',
            'quick-match-modal',
            'rules-modal',
            'custom-room-overlay'
        ];

        for (let id of auxiliaryModalIds) {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden') && el.style.display !== 'none') {
                el.classList.add('hidden');
                el.style.display = 'none';
                return;
            }
        }

        // Priority 2: If the back confirmation modal itself is open, dismiss it (cancel)
        const confirmModal = document.getElementById('ludo-back-confirm-modal');
        if (confirmModal && !confirmModal.classList.contains('hidden') && confirmModal.style.display !== 'none') {
            closeModal();
            return;
        }

        // Priority 3: Victory Modal - back directly returns to Lobby
        const victoryModal = document.getElementById('victory-modal');
        if (victoryModal && !victoryModal.classList.contains('hidden') && victoryModal.style.display !== 'none') {
            window.location.href = 'index.html';
            return;
        }

        // Priority 4: Online Multiplayer Lobby Back Navigation
        const onlineModal = document.getElementById('online-modal');
        if (onlineModal && !onlineModal.classList.contains('hidden') && onlineModal.style.display !== 'none') {
            const matchmakingSub = document.getElementById('matchmaking-sub');
            if (matchmakingSub && !matchmakingSub.classList.contains('hidden')) {
                if (typeof window.cancelOnlineMatchmaking === 'function') {
                    window.cancelOnlineMatchmaking();
                } else if (typeof window.backToOnlineMain === 'function') {
                    window.backToOnlineMain();
                }
                return;
            }

            const customRoomLobby = document.getElementById('custom-room-lobby');
            if (customRoomLobby && !customRoomLobby.classList.contains('hidden')) {
                if (typeof window.leaveCustomRoom === 'function') {
                    window.leaveCustomRoom();
                } else if (typeof window.backToOnlineMain === 'function') {
                    window.backToOnlineMain();
                }
                return;
            }

            const quickMatchSub = document.getElementById('quick-match-sub');
            if (quickMatchSub && !quickMatchSub.classList.contains('hidden')) {
                if (typeof window.backToOnlineMain === 'function') {
                    window.backToOnlineMain();
                }
                return;
            }

            const createRoomSub = document.getElementById('create-room-sub');
            if (createRoomSub && !createRoomSub.classList.contains('hidden')) {
                if (typeof window.backToOnlineMain === 'function') {
                    window.backToOnlineMain();
                }
                return;
            }

            const joinRoomSub = document.getElementById('join-room-sub');
            if (joinRoomSub && !joinRoomSub.classList.contains('hidden')) {
                if (typeof window.backToOnlineMain === 'function') {
                    window.backToOnlineMain();
                }
                return;
            }

            // In main online menu -> go back to index.html
            window.location.href = 'index.html';
            return;
        }

        // Priority 5: Local & Bot Offline Pre-Game Modals
        const fastTrackModal = document.getElementById('fast-track-modal') || document.getElementById('bot-fast-track-modal');
        if (fastTrackModal && !fastTrackModal.classList.contains('hidden') && fastTrackModal.style.display !== 'none') {
            fastTrackModal.classList.add('hidden');
            const startupModal = document.getElementById('startup-modal');
            if (startupModal) startupModal.classList.remove('hidden');
            return;
        }

        const startupModal = document.getElementById('startup-modal');
        if (startupModal && !startupModal.classList.contains('hidden') && startupModal.style.display !== 'none') {
            window.location.href = 'index.html';
            return;
        }

        // Priority 6: Competition specific view transitions
        if (currentMode === 'competition') {
            const leaderboard = document.getElementById('leaderboard-view');
            if (leaderboard && !leaderboard.classList.contains('hidden') && leaderboard.style.display !== 'none') {
                if (typeof window.closeLeaderboardView === 'function') {
                    window.closeLeaderboardView();
                } else {
                    leaderboard.classList.add('hidden');
                }
                return;
            }

            const matchmaking = document.getElementById('matchmaking-section');
            if (matchmaking && !matchmaking.classList.contains('hidden') && matchmaking.style.display !== 'none') {
                if (typeof window.cancelMatchmaking === 'function') {
                    window.cancelMatchmaking();
                } else {
                    matchmaking.classList.add('hidden');
                }
                return;
            }

            const ludoWrapper = document.getElementById('ludo-wrapper');
            if (ludoWrapper && !ludoWrapper.classList.contains('hidden') && ludoWrapper.style.display !== 'none') {
                showMatchLeaveModal();
                return;
            }

            // In Competition lobby tables screen -> navigate back to main dashboard
            window.location.href = 'index.html';
            return;
        }

        // Priority 4: Dashboard vs Active Match
        if (currentMode === 'dashboard') {
            showDashboardExitModal();
        } else {
            showMatchLeaveModal();
        }
    }

    function showDashboardExitModal() {
        renderModal({
            badge: "🚪",
            title: "Exit Game",
            message: "Are you sure you want to exit Ludo?",
            primaryText: "Exit",
            primaryBg: "linear-gradient(135deg, #ef4444, #b91c1c)",
            primaryBorder: "#f87171",
            secondaryText: "Stay",
            onPrimary: function () {
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                    window.Capacitor.Plugins.App.exitApp();
                } else if (navigator.app && navigator.app.exitApp) {
                    navigator.app.exitApp();
                } else {
                    window.close();
                }
            },
            onSecondary: closeModal
        });
    }

    function showMatchLeaveModal() {
        renderModal({
            badge: "⚠️",
            title: "Leave Match?",
            message: "Are you sure you want to leave the match? Any ongoing game progress will be forfeited.",
            primaryText: "Leave Match",
            primaryBg: "linear-gradient(135deg, #ef4444, #b91c1c)",
            primaryBorder: "#f87171",
            secondaryText: "Continue Playing",
            onPrimary: async function () {
                try {
                    if (window.ZingFeatures && window.ZingFeatures.leaveVoiceRoom) {
                        window.ZingFeatures.leaveVoiceRoom();
                    }
                    if (window.socket && window.currentOnlineRoomId) {
                        window.socket.emit('leave-room', { roomId: window.currentOnlineRoomId });
                    }
                } catch (e) {}

                // Mid-game exit: Play Interstitial Ad
                if (typeof playInterstitialAd === 'function') {
                    try {
                        await playInterstitialAd();
                    } catch (err) {}
                } else if (typeof window.showZingInterstitialAd === 'function') {
                    try {
                        await window.showZingInterstitialAd();
                    } catch (err) {}
                }

                window.location.href = 'index.html';
            },
            onSecondary: closeModal
        });
    }

    function renderModal(config) {
        let modal = document.getElementById('ludo-back-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ludo-back-confirm-modal';
            modal.className = 'modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(3, 7, 18, 0.88);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                padding: 16px;
                box-sizing: border-box;
            `;
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="
                background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
                border: 2px solid #ffd700;
                box-shadow: 0 24px 48px rgba(0, 0, 0, 0.9), 0 0 24px rgba(255, 215, 0, 0.35);
                border-radius: 20px;
                padding: 24px 20px;
                max-width: 340px;
                width: 100%;
                text-align: center;
                box-sizing: border-box;
                animation: ludoBackPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
                <div style="
                    width: 58px;
                    height: 58px;
                    margin: 0 auto 12px auto;
                    background: rgba(255, 215, 0, 0.12);
                    border: 2px solid #ffd700;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 26px;
                    box-shadow: 0 0 16px rgba(255, 215, 0, 0.35);
                ">${config.badge}</div>

                <h3 style="
                    margin: 0 0 8px 0;
                    color: #ffd700;
                    font-size: 18px;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                ">${config.title}</h3>

                <p style="
                    margin: 0 0 22px 0;
                    color: #cbd5e1;
                    font-size: 13.5px;
                    line-height: 1.5;
                    font-weight: 500;
                ">${config.message}</p>

                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="ludo-back-secondary-btn" style="
                        flex: 1;
                        padding: 12px 14px;
                        background: rgba(51, 65, 85, 0.85);
                        border: 1px solid rgba(148, 163, 184, 0.35);
                        color: #f8fafc;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 800;
                        cursor: pointer;
                        transition: transform 0.15s ease;
                    ">${config.secondaryText}</button>

                    <button id="ludo-back-primary-btn" style="
                        flex: 1;
                        padding: 12px 14px;
                        background: ${config.primaryBg};
                        border: 1px solid ${config.primaryBorder};
                        color: #ffffff;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 800;
                        cursor: pointer;
                        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
                        transition: transform 0.15s ease;
                    ">${config.primaryText}</button>
                </div>
            </div>
        `;

        if (!document.getElementById('ludo-back-anim-style')) {
            const style = document.createElement('style');
            style.id = 'ludo-back-anim-style';
            style.textContent = `
                @keyframes ludoBackPop {
                    0% { transform: scale(0.85); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        isModalOpen = true;

        document.getElementById('ludo-back-secondary-btn').onclick = function () {
            if (config.onSecondary) config.onSecondary();
        };

        document.getElementById('ludo-back-primary-btn').onclick = function () {
            if (config.onPrimary) config.onPrimary();
        };
    }

    function closeModal() {
        const modal = document.getElementById('ludo-back-confirm-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
        isModalOpen = false;
    }

    return {
        init: init,
        handleBackPress: handleBackPress,
        closeModal: closeModal
    };
})();
