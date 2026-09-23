const HowToPlayGuide = {
    rules: [
        {
            badge: "🎲 Classic Ludo Rules",
            content: "• Each player has 4 tokens in their yard.\n• Roll a 6 on the dice to move a token onto the active track.\n• Tokens travel clockwise around the board towards their home column.\n• All 4 tokens must reach the center triangle to win the game.\n• Landing on an opponent's token captures it and returns it to their yard.\n• Safe cells (marked with a star icon) protect tokens from being captured.\n• Rolling a 6 or capturing an opponent token grants an extra bonus roll."
        },
        {
            badge: "⚡ Quick Mode Rules",
            content: "• Fast-paced 5-minute action mode.\n• Only 2 tokens need to reach the home triangle to secure victory!\n• Stay aggressive and capture opponent tokens early to gain a lead."
        },
        {
            badge: "🤝 2 vs 2 Team Mode",
            content: "• 4 players form two rival teams: Red & Yellow vs Green & Blue.\n• Teammates cannot capture or cut each other's tokens.\n• Coordinate moves to block opponents and escort partner tokens home."
        },
        {
            badge: "🤖 Play vs Computer (Smart AI)",
            content: "• Play offline anytime without internet connection.\n• Intelligent AI bots roll automatically and execute tactical moves."
        },
        {
            badge: "🎙️ Voice Mic & Quick Chat",
            content: "• Tap the Mic button in matches to talk with other players live.\n• Tap the Chat button to send tactical shouts or throw animated emojis."
        },
        {
            badge: "🏆 Pro Arena Competition",
            content: "• Enter competitive matches using Zing Coins.\n• Win matches to collect prizes and advance up the global leaderboard."
        }
    ],
    openModal: function() {
        let modal = document.getElementById('how-to-play-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'how-to-play-modal';
            modal.className = 'modal';
            modal.style.zIndex = '99999';
            document.body.appendChild(modal);
        }
        this.renderContent();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    },
    closeModal: function() {
        const modal = document.getElementById('how-to-play-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    },
    renderContent: function() {
        const modal = document.getElementById('how-to-play-modal');
        if (!modal) return;
        
        let modesHtml = this.rules.map(m => {
            return `<div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; margin-bottom: 10px; text-align: left;">
                <div style="font-weight: 900; color: #ffd700; font-size: 14px; margin-bottom: 6px;">${m.badge}</div>
                <div style="font-size: 12px; color: #e2e8f0; line-height: 1.6; white-space: pre-line;">${m.content}</div>
            </div>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 480px; width: 92%; max-height: 85vh; display: flex; flex-direction: column; padding: 18px; border-radius: 16px; border: 2px solid #ffd700; background: linear-gradient(180deg, #1e293b, #0f172a); position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px;">
                    <h2 style="color: #ffd700; font-size: 18px; font-weight: 900; margin: 0;">📖 How to Play Ludo</h2>
                    <button onclick="HowToPlayGuide.closeModal()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>
                <div style="flex: 1; overflow-y: auto; padding-right: 4px; margin-bottom: 12px;">
                    ${modesHtml}
                </div>
                <button onclick="HowToPlayGuide.closeModal()" class="ultra-roll-btn" style="width: 100%; padding: 10px; font-weight: 800; border-radius: 10px;">
                    Close Guide
                </button>
            </div>
        `;
    }
};

window.HowToPlayGuide = HowToPlayGuide;
