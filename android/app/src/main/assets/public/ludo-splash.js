// ludo-splash.js - Zing Arena Instant App Startup Engine
// Displays ONLY on initial app boot/first launch (never on mode clicks).
// Prevents any white screen during cold start and gives fast native startup feel.

(function() {
    // Hide native Capacitor splash screen immediately if available
    function dismissNativeSplash() {
        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
                window.Capacitor.Plugins.SplashScreen.hide();
            }
        } catch (e) {
            console.log("Native splash dismiss error", e);
        }
    }

    function hideSplash() {
        const splash = document.getElementById('ludo-royal-splash');
        if (!splash) return;
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.classList.add('hidden');
        }, 360);
    }

    // Never show splash when clicking modes; navigate instantly with sound
    function navigateInstant(url) {
        try {
            const popSound = new Audio('sounds/ui pop_2.mp3');
            popSound.play().catch(() => {});
        } catch (e) {}
        window.location.href = url;
    }

    // Attach to window
    window.LudoSplash = {
        hide: hideSplash,
        navigate: navigateInstant
    };

    // Cold boot sequence on App Initial Launch (Lobby / index.html only)
    function runLaunchSequence() {
        dismissNativeSplash();

        const splash = document.getElementById('ludo-royal-splash');
        if (!splash) return;

        // If not main index lobby, hide immediately
        const isGameScreen = window.location.pathname.includes('online.html') ||
                             window.location.pathname.includes('bot.html') ||
                             window.location.pathname.includes('local.html') ||
                             window.location.pathname.includes('competition.html');

        if (isGameScreen || sessionStorage.getItem('ludo_booted')) {
            splash.style.display = 'none';
            splash.classList.add('hidden');
            return;
        }
        sessionStorage.setItem('ludo_booted', 'true');

        const bar = document.getElementById('splash-progress-bar');
        const statusEl = document.getElementById('splash-status-text');

        // Authentic fast Ludo King initial load sequence
        if (bar) bar.style.width = '30%';
        if (statusEl) statusEl.innerText = 'Starting Game Engine...';

        setTimeout(() => {
            if (bar) bar.style.width = '70%';
            if (statusEl) statusEl.innerText = 'Loading Boards & Audio...';
        }, 350);

        setTimeout(() => {
            if (bar) bar.style.width = '100%';
            if (statusEl) statusEl.innerText = 'Welcome to Zing Arena!';
        }, 750);

        setTimeout(() => {
            hideSplash();
        }, 1100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runLaunchSequence);
    } else {
        runLaunchSequence();
    }
})();
