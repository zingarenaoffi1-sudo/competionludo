const AdMobConfig = {
    appId: 'ca-app-pub-3940256099942544~3347511713',
    bannerAdId: 'ca-app-pub-3940256099942544/9214589741',
    interstitialAdId: 'ca-app-pub-3940256099942544/1033173712',
    rewardedAdId: 'ca-app-pub-3940256099942544/5224354917',
    isTesting: true
};

window.AdMobConfig = AdMobConfig;

function showAdToast(msg, isSuccess = false) {
    let toast = document.getElementById('ad-toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ad-toast-msg';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.borderColor = isSuccess ? '#22c55e' : '#f43f5e';
    toast.style.color = isSuccess ? '#4ade80' : '#ff6b6b';
    toast.style.display = 'block';

    if (window._adToastTimer) clearTimeout(window._adToastTimer);
    window._adToastTimer = setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}
window.showAdToast = showAdToast;

let _zingBannerInitialized = false;
let _zingBannerVisible = false;

function initZingBannerAd(options = {}) {
    const delay = (typeof options.delay === 'number') ? options.delay : 2000;

    const tryShowBanner = async () => {
        if (!navigator.onLine) {
            hideZingBannerAd();
            return;
        }

        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
                const { AdMob } = window.Capacitor.Plugins;
                const bannerId = (window.AdMobConfig && window.AdMobConfig.bannerAdId) || 'ca-app-pub-3940256099942544/9214589741';
                const isTesting = (window.AdMobConfig && typeof window.AdMobConfig.isTesting === 'boolean') ? window.AdMobConfig.isTesting : true;

                if (!_zingBannerInitialized) {
                    await AdMob.initialize({ initializeForTesting: isTesting });
                    _zingBannerInitialized = true;
                }

                await AdMob.showBanner({
                    adId: bannerId,
                    position: 'TOP_CENTER',
                    margin: 0
                });
                _zingBannerVisible = true;
            } else {
                const el = document.getElementById('test-banner');
                if (el && navigator.onLine) el.style.display = 'flex';
            }
        } catch (e) {
            console.warn('[AdMob] Banner skipped:', e);
        }
    };

    if (!navigator.onLine) {
        hideZingBannerAd();
    } else {
        setTimeout(tryShowBanner, delay);
    }

    window.removeEventListener('online', _handleNetworkOnline);
    window.removeEventListener('offline', _handleNetworkOffline);
    window.addEventListener('online', _handleNetworkOnline);
    window.addEventListener('offline', _handleNetworkOffline);
}

function _handleNetworkOnline() {
    initZingBannerAd({ delay: 600 });
}

function _handleNetworkOffline() {
    hideZingBannerAd();
}

async function hideZingBannerAd() {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const { AdMob } = window.Capacitor.Plugins;
            await AdMob.hideBanner();
            _zingBannerVisible = false;
        }
    } catch (e) {}
    const el = document.getElementById('test-banner');
    if (el) el.style.display = 'none';
}

window.initZingBannerAd = initZingBannerAd;
window.hideZingBannerAd = hideZingBannerAd;

async function showZingRewardedAd({ onReward, onFail }) {
    if (!navigator.onLine) {
        showAdToast('⚠️ No internet connection! Please connect to internet to watch video and unlock token.');
        if (typeof onFail === 'function') {
            onFail({ reason: 'NO_INTERNET', message: 'No internet connection' });
        }
        return;
    }

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        const { AdMob } = window.Capacitor.Plugins;
        const rewardedId = (window.AdMobConfig && window.AdMobConfig.rewardedAdId) || 'ca-app-pub-3940256099942544/5224354917';
        const isTesting = (window.AdMobConfig && typeof window.AdMobConfig.isTesting === 'boolean') ? window.AdMobConfig.isTesting : true;

        let rewardGranted = false;

        try {
            showAdToast('⏳ Loading video ad, please wait...', true);

            await AdMob.prepareRewardVideoAd({
                adId: rewardedId,
                isTesting: isTesting
            });

            const rewardHandle = await AdMob.addListener('onRewardedVideoAdReward', () => {
                rewardGranted = true;
                showAdToast('🎉 Video completed! 1 token unlocked successfully.', true);
                if (typeof onReward === 'function') {
                    onReward();
                }
            });

            const dismissHandle = await AdMob.addListener('onRewardedVideoAdDismissed', () => {
                if (rewardHandle && rewardHandle.remove) rewardHandle.remove();
                if (dismissHandle && dismissHandle.remove) dismissHandle.remove();

                if (!rewardGranted) {
                    showAdToast('⚠️ Video was not completed! Token was not unlocked.');
                    if (typeof onFail === 'function') {
                        onFail({ reason: 'DISMISSED_EARLY', message: 'Video was dismissed before completion' });
                    }
                }
            });

            await AdMob.showRewardVideoAd();

        } catch (err) {
            console.warn('[AdMob] Rewarded ad error:', err);
            showAdToast('⚠️ Failed to load video ad. Please check your internet.');
            if (typeof onFail === 'function') {
                onFail({ reason: 'AD_FAILED', message: err.message || 'Ad load failed' });
            }
        }
    } else {
        if (!navigator.onLine) {
            showAdToast('⚠️ No internet connection! Please turn on internet.');
            if (typeof onFail === 'function') onFail({ reason: 'NO_INTERNET' });
            return;
        }

        const userAccepted = confirm('📺 Watch video ad to unlock 1 token?');
        if (userAccepted) {
            showAdToast('🎉 Video completed! 1 token unlocked.', true);
            if (typeof onReward === 'function') onReward();
        } else {
            showAdToast('⚠️ Video cancelled. Token was not unlocked.');
            if (typeof onFail === 'function') onFail({ reason: 'USER_CANCELLED' });
        }
    }
}
window.showZingRewardedAd = showZingRewardedAd;

