const UnityAdsConfig = {
    gameId: '800378570',
    bannerPlacement: 'BP_Banner_Android',
    interstitialPlacement: 'BP_Interstitial_Android',
    rewardedPlacement: 'BP_Rewarded_Android',
    isTesting: false // Production live mode for release APK; native plugin handles test fallback
};

window.UnityAdsConfig = UnityAdsConfig;

let _unityBridgeInstance = null;

function getUnityAdsBridge() {
    if (_unityBridgeInstance) {
        return _unityBridgeInstance;
    }
    if (window.Capacitor) {
        // 1. Standard Capacitor registerPlugin
        if (typeof window.Capacitor.registerPlugin === 'function') {
            try {
                _unityBridgeInstance = window.Capacitor.registerPlugin('UnityAdsBridge');
                if (_unityBridgeInstance) return _unityBridgeInstance;
            } catch (err) {
                console.warn('[UnityAds] registerPlugin failed, checking Plugins map:', err);
            }
        }
        // 2. Plugins map check
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
            _unityBridgeInstance = window.Capacitor.Plugins.UnityAdsBridge;
            return _unityBridgeInstance;
        }
        // 3. Direct native bridge fallback wrapper
        if (typeof window.Capacitor.toNative === 'function') {
            _unityBridgeInstance = {
                initialize: (opts) => window.Capacitor.toNative('UnityAdsBridge', 'initialize', opts),
                showBanner: (opts) => window.Capacitor.toNative('UnityAdsBridge', 'showBanner', opts),
                hideBanner: (opts) => window.Capacitor.toNative('UnityAdsBridge', 'hideBanner', opts),
                showInterstitial: (opts) => window.Capacitor.toNative('UnityAdsBridge', 'showInterstitial', opts),
                showRewarded: (opts) => window.Capacitor.toNative('UnityAdsBridge', 'showRewarded', opts)
            };
            return _unityBridgeInstance;
        }
    }
    return null;
}
window.getUnityAdsBridge = getUnityAdsBridge;

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
    }, 3800);
}
window.showAdToast = showAdToast;

async function initZingAds() {
    const bridge = getUnityAdsBridge();
    if (bridge) {
        try {
            await bridge.initialize({
                gameId: UnityAdsConfig.gameId,
                isTesting: UnityAdsConfig.isTesting
            });
            console.log('[UnityAds] SDK initialized successfully.');
        } catch (e) {
            console.warn('[UnityAds] SDK init notice:', e);
        }
    }
}
window.initZingAds = initZingAds;

function initZingBannerAd(options = {}) {
    const delay = (typeof options.delay === 'number') ? options.delay : 800;

    const tryShowBanner = async () => {
        if (!navigator.onLine) {
            hideZingBannerAd();
            return;
        }

        try {
            const bridge = getUnityAdsBridge();
            if (bridge) {
                const res = await bridge.showBanner({
                    gameId: UnityAdsConfig.gameId,
                    placementId: UnityAdsConfig.bannerPlacement,
                    isTesting: UnityAdsConfig.isTesting,
                    position: 'bottom'
                });
                console.log('[UnityAds] Banner response:', res);
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
        const bridge = getUnityAdsBridge();
        if (bridge) {
            await bridge.hideBanner();
        }
    } catch (e) {}
}

window.initZingBannerAd = initZingBannerAd;
window.hideZingBannerAd = hideZingBannerAd;

async function playInterstitialAd() {
    if (!navigator.onLine) {
        return;
    }

    const bridge = getUnityAdsBridge();
    if (bridge) {
        try {
            if (window.socket && (window.currentOnlineRoomId || window.currentRoomId)) {
                const rId = window.currentOnlineRoomId || window.currentRoomId;
                window.socket.emit('ad-playback-status', { roomId: rId, isShowing: true });
            }

            const showPromise = bridge.showInterstitial({
                gameId: UnityAdsConfig.gameId,
                placementId: UnityAdsConfig.interstitialPlacement,
                isTesting: UnityAdsConfig.isTesting
            });
            // Give adequate 8s window for Unity video to load & show without cutting off
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 8000));
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
        console.log('[UnityAds] Interstitial simulated in browser.');
    }
}
window.playInterstitialAd = playInterstitialAd;
window.showZingInterstitialAd = playInterstitialAd;

async function showZingRewardedAd({ onReward, onFail }) {
    if (!navigator.onLine) {
        showAdToast('⚠️ No internet connection! Please connect to internet to watch the ad.');
        if (typeof onFail === 'function') {
            onFail({ reason: 'NO_INTERNET' });
        }
        return;
    }

    const bridge = getUnityAdsBridge();
    if (bridge) {
        try {
            showAdToast('⏳ Loading video ad, please wait...', true);

            const adPromise = bridge.showRewarded({
                gameId: UnityAdsConfig.gameId,
                placementId: UnityAdsConfig.rewardedPlacement,
                isTesting: UnityAdsConfig.isTesting
            });

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Ad load timed out')), 22000);
            });

            const result = await Promise.race([adPromise, timeoutPromise]);

            if (result && result.rewarded) {
                showAdToast('✅ Video completed! Reward unlocked.', true);
                if (typeof onReward === 'function') {
                    onReward();
                }
            } else if (result && result.reason === 'SKIPPED') {
                showAdToast('⚠️ Video was skipped. Watch the full ad to claim rewards.');
                if (typeof onFail === 'function') {
                    onFail({ reason: 'DISMISSED_EARLY' });
                }
            } else {
                const errText = (result && result.error) ? result.error : 'Ad not finished';
                console.warn('[UnityAds] Rewarded ad not completed:', errText);
                showAdToast('⚠️ ' + errText);
                if (typeof onFail === 'function') {
                    onFail({ reason: 'FAILED', error: errText });
                }
            }
        } catch (err) {
            console.warn('[UnityAds] Native Rewarded ad failed:', err);
            const msg = (err && err.message) ? err.message : 'Ad load nahi ho saka';
            showAdToast('⚠️ ' + msg + ' (Reward tabhi milega jab video pura dekhenge)');
            if (typeof onFail === 'function') {
                onFail({ reason: 'LOAD_FAILED', error: err });
            }
        }
    } else {
        showAdToast('⚠️ Ads sirf Android APK par available hain.');
        if (typeof onFail === 'function') {
            onFail({ reason: 'NOT_IN_NATIVE_APP' });
        }
    }
}
window.showZingRewardedAd = showZingRewardedAd;

function autoBootstrapAds() {
    initZingAds();
    initZingBannerAd({ delay: 1000 });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBootstrapAds);
} else {
    autoBootstrapAds();
}

// In case Capacitor initializes after document load
setTimeout(autoBootstrapAds, 1200);
setTimeout(autoBootstrapAds, 3000);
