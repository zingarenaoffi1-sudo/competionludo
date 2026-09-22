const UnityAdsConfig = {
    gameId: '800378570',
    bannerPlacement: 'Banner_Android',
    interstitialPlacement: 'Interstitial_Android',
    rewardedPlacement: 'Rewarded_Android',
    isTesting: true
};

window.UnityAdsConfig = UnityAdsConfig;

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

function initZingBannerAd(options = {}) {
    const delay = (typeof options.delay === 'number') ? options.delay : 1000;

    const tryShowBanner = async () => {
        if (!navigator.onLine) {
            hideZingBannerAd();
            return;
        }

        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
                const { UnityAdsBridge } = window.Capacitor.Plugins;
                await UnityAdsBridge.showBanner({
                    placementId: UnityAdsConfig.bannerPlacement,
                    isTesting: UnityAdsConfig.isTesting,
                    position: 'bottom'
                });
            }
        } catch (e) {
            console.warn('[UnityAds] Banner load failed:', e);
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
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
            const { UnityAdsBridge } = window.Capacitor.Plugins;
            await UnityAdsBridge.hideBanner();
        }
    } catch (e) {}
}

window.initZingBannerAd = initZingBannerAd;
window.hideZingBannerAd = hideZingBannerAd;

async function playInterstitialAd() {
    if (!navigator.onLine) {
        return;
    }

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
        const { UnityAdsBridge } = window.Capacitor.Plugins;
        try {
            if (window.socket && (window.currentOnlineRoomId || window.currentRoomId)) {
                const rId = window.currentOnlineRoomId || window.currentRoomId;
                window.socket.emit('ad-playback-status', { roomId: rId, isShowing: true });
            }

            const showPromise = UnityAdsBridge.showInterstitial({
                placementId: UnityAdsConfig.interstitialPlacement,
                isTesting: UnityAdsConfig.isTesting
            });
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 14000));
            await Promise.race([showPromise, timeoutPromise]);
        } catch (e) {
            console.warn('[UnityAds] Interstitial error:', e);
        } finally {
            if (window.socket && (window.currentOnlineRoomId || window.currentRoomId)) {
                const rId = window.currentOnlineRoomId || window.currentRoomId;
                window.socket.emit('ad-playback-status', { roomId: rId, isShowing: false });
            }
        }
    } else {
        console.log('[UnityAds] Interstitial triggered in browser.');
    }
}
window.playInterstitialAd = playInterstitialAd;
window.showZingInterstitialAd = playInterstitialAd;

async function showZingRewardedAd({ onReward, onFail }) {
    if (!navigator.onLine) {
        showAdToast('⚠️ No internet connection! Please connect to the internet to watch the ad.');
        if (typeof onFail === 'function') {
            onFail({ reason: 'NO_INTERNET' });
        }
        return;
    }

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
        const { UnityAdsBridge } = window.Capacitor.Plugins;
        try {
            showAdToast('⏳ Loading video ad, please wait...', true);

            const result = await UnityAdsBridge.showRewarded({
                placementId: UnityAdsConfig.rewardedPlacement,
                isTesting: UnityAdsConfig.isTesting
            });

            if (result && result.rewarded) {
                showAdToast('✅ Video completed! Reward unlocked.', true);
                if (typeof onReward === 'function') {
                    onReward();
                }
            } else {
                showAdToast('⚠️ Video was not completed. Reward not granted.');
                if (typeof onFail === 'function') {
                    onFail({ reason: 'DISMISSED_EARLY' });
                }
            }
        } catch (err) {
            console.warn('[UnityAds] Native Rewarded ad failed:', err);
            showAdToast('⚠️ Ad failed to load. Please try again later.');
            if (typeof onFail === 'function') {
                onFail({ reason: 'LOAD_FAILED', error: err });
            }
        }
    } else {
        showAdToast('🎬 Browser Test: Simulating video ad (3s)...', true);
        setTimeout(() => {
            showAdToast('✅ Video completed! Reward unlocked.', true);
            if (typeof onReward === 'function') {
                onReward();
            }
        }, 3000);
    }
}
window.showZingRewardedAd = showZingRewardedAd;
