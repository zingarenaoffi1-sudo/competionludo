// ludo-splash.js - Royal Ludo King Style Instant Splash & Loading Screen
// 100% Copyright-Free, Vector-Rendered, Ultra-Smooth Native Game Transition Engine

(function() {
    function injectSplashElements() {
        if (document.getElementById('ludo-royal-splash')) return;

        const splash = document.createElement('div');
        splash.id = 'ludo-royal-splash';
        splash.className = 'ludo-splash-overlay';
        splash.innerHTML = `
            <div class="ludo-splash-card">
                <!-- Royal Golden Crown & Emblem -->
                <div class="ludo-emblem-wrap">
                    <div class="ludo-crown-icon">
                        <svg width="68" height="52" viewBox="0 0 64 50" fill="none">
                            <defs>
                                <linearGradient id="splash-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#fffbeb"/>
                                    <stop offset="35%" stop-color="#fde047"/>
                                    <stop offset="70%" stop-color="#eab308"/>
                                    <stop offset="100%" stop-color="#b45309"/>
                                </linearGradient>
                                <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur"/>
                                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                                </filter>
                            </defs>
                            <path d="M6 38C6 36.5 7.5 35 9 35H55C56.5 35 58 36.5 58 38V42C58 43.5 56.5 45 55 45H9C7.5 45 6 43.5 6 42V38Z" fill="#92400e"/>
                            <path d="M8 35L14 17L25 27L32 9L39 27L50 17L56 35H8Z" fill="url(#splash-gold-grad)" filter="url(#gold-glow)"/>
                            <circle cx="14" cy="15" r="4" fill="#ffffff" stroke="#eab308" stroke-width="1.5"/>
                            <circle cx="32" cy="7" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                            <circle cx="50" cy="15" r="4" fill="#ffffff" stroke="#eab308" stroke-width="1.5"/>
                        </svg>
                    </div>

                    <!-- 4-Color Royal Ludo Emblem Quad -->
                    <div class="ludo-emblem-disc">
                        <div class="quad red"></div>
                        <div class="quad green"></div>
                        <div class="quad yellow"></div>
                        <div class="quad blue"></div>
                        <div class="emblem-center-star">⭐</div>
                    </div>
                </div>

                <!-- Title & Typography -->
                <div class="splash-brand-title">LUDO</div>
                <div class="splash-brand-subtitle" id="splash-status-title">ROYAL ARENA</div>

                <!-- 3D Rolling Dice Animation -->
                <div class="splash-dice-scene">
                    <div class="splash-dice-cube" id="splash-dice-cube">
                        <div class="s-face s-front">⚄</div>
                        <div class="s-face s-back">⚂</div>
                        <div class="s-face s-right">⚅</div>
                        <div class="s-face s-left">⚀</div>
                        <div class="s-face s-top">⚃</div>
                        <div class="s-face s-bottom">⚁</div>
                    </div>
                </div>

                <!-- Shimmer Progress Bar -->
                <div class="splash-progress-track">
                    <div class="splash-progress-fill" id="splash-progress-bar"></div>
                </div>

                <div class="splash-status-text" id="splash-status-text">Starting Game Engine...</div>
            </div>
        `;
        document.body.prepend(splash);
    }

    function showSplash(title, statusMsg) {
        injectSplashElements();
        const splash = document.getElementById('ludo-royal-splash');
        if (!splash) return;

        const titleEl = document.getElementById('splash-status-title');
        const statusEl = document.getElementById('splash-status-text');
        const bar = document.getElementById('splash-progress-bar');

        if (titleEl && title) titleEl.innerText = title;
        if (statusEl && statusMsg) statusEl.innerText = statusMsg;

        if (bar) {
            bar.style.transition = 'width 0.25s ease';
            bar.style.width = '15%';
            setTimeout(() => { bar.style.width = '100%'; }, 20);
        }

        splash.classList.remove('hidden');
        splash.classList.remove('fade-out');
    }

    function hideSplash() {
        const splash = document.getElementById('ludo-royal-splash');
        if (!splash) return;
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.classList.add('hidden');
        }, 360);
    }

    // Instant click navigation helper
    function navigateWithSplash(url, modeName) {
        showSplash(modeName || 'ENTERING ARENA...', 'Connecting to Royal Arena...');
        const popSound = new Audio('sounds/ui pop_2.mp3');
        popSound.play().catch(() => {});

        setTimeout(() => {
            window.location.href = url;
        }, 280);
    }

    // Attach to window early
    window.LudoSplash = {
        show: showSplash,
        hide: hideSplash,
        navigate: navigateWithSplash
    };

    // Automatic Launch Sequence on App Startup
    function runLaunchSequence() {
        const splash = document.getElementById('ludo-royal-splash');
        if (!splash) return;

        const isGameScreen = window.location.pathname.includes('online.html') ||
                             window.location.pathname.includes('bot.html') ||
                             window.location.pathname.includes('local.html') ||
                             window.location.pathname.includes('competition.html');

        const bar = document.getElementById('splash-progress-bar');
        const statusEl = document.getElementById('splash-status-text');

        if (isGameScreen) {
            // Game screen quick transition (approx 600ms)
            if (bar) bar.style.width = '45%';
            setTimeout(() => {
                if (bar) bar.style.width = '100%';
                if (statusEl) statusEl.innerText = 'Arena Ready!';
            }, 300);
            setTimeout(() => {
                hideSplash();
            }, 650);
        } else {
            // Main Lobby / First launch (feels like Ludo King initial startup)
            if (bar) bar.style.width = '20%';
            if (statusEl) statusEl.innerText = 'Starting Game Engine...';

            setTimeout(() => {
                if (bar) bar.style.width = '55%';
                if (statusEl) statusEl.innerText = 'Loading Boards & Audio...';
            }, 400);

            setTimeout(() => {
                if (bar) bar.style.width = '88%';
                if (statusEl) statusEl.innerText = 'Connecting Royal Arena...';
            }, 850);

            setTimeout(() => {
                if (bar) bar.style.width = '100%';
                if (statusEl) statusEl.innerText = 'Welcome to Ludo!';
            }, 1250);

            setTimeout(() => {
                hideSplash();
            }, 1600);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runLaunchSequence);
    } else {
        runLaunchSequence();
    }
})();
