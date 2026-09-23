(function() {
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

    function navigateInstant(url) {
        try {
            const popSound = new Audio('sounds/ui pop_2.mp3');
            popSound.play().catch(() => {});
        } catch (e) {}
        window.location.href = url;
    }

    window.LudoSplash = {
        hide: hideSplash,
        navigate: navigateInstant
    };

    function runLaunchSequence() {
        dismissNativeSplash();

        const splash = document.getElementById('ludo-royal-splash');
        if (!splash) return;

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
            if (window.initZingBannerAd) {
                window.initZingBannerAd({ delay: 300 });
            }
        }, 1100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runLaunchSequence);
    } else {
        runLaunchSequence();
    }
})();
