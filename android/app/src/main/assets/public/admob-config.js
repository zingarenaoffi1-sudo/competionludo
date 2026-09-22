const UnityAdsConfig = {
    gameId: '800378570',
    bannerPlacement: 'BP_Banner_Android',
    interstitialPlacement: 'BP_Interstitial_Android',
    rewardedPlacement: 'BP_Rewarded_Android',
    isTesting: false
};

window.UnityAdsConfig = UnityAdsConfig;
// Keep AdMobConfig alias for backwards compatibility
window.AdMobConfig = {
    appId: UnityAdsConfig.gameId,
    bannerAdId: UnityAdsConfig.bannerPlacement,
    interstitialAdId: UnityAdsConfig.interstitialPlacement,
    rewardedAdId: UnityAdsConfig.rewardedPlacement,
    isTesting: UnityAdsConfig.isTesting
};

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
    const delay = (typeof options.delay === 'number') ? options.delay : 2000;

    const tryShowBanner = async () => {
        if (!navigator.onLine) {
            hideZingBannerAd();
            return;
        }

        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
                const { UnityAdsBridge } = window.Capacitor.Plugins;
                await UnityAdsBridge.showBanner({
                    placementId: UnityAdsConfig.bannerPlacement
                });
            } else {
                const el = document.getElementById('test-banner');
                if (el && navigator.onLine) el.style.display = 'flex';
            }
        } catch (e) {
            console.warn('[UnityAds] Banner skipped:', e);
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
    const el = document.getElementById('test-banner');
    if (el) el.style.display = 'none';
}

window.initZingBannerAd = initZingBannerAd;
window.hideZingBannerAd = hideZingBannerAd;

async function playInterstitialAd() {
    if (!navigator.onLine) {
        console.log('[UnityAds] Offline: Skipping interstitial ad.');
        return;
    }

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
        const { UnityAdsBridge } = window.Capacitor.Plugins;
        try {
            if (window.socket && (window.currentOnlineRoomId || window.currentRoomId)) {
                const rId = window.currentOnlineRoomId || window.currentRoomId;
                window.socket.emit('ad-playback-status', { roomId: rId, isShowing: true });
            }

            await UnityAdsBridge.showInterstitial({
                placementId: UnityAdsConfig.interstitialPlacement
            });
        } catch (e) {
            console.warn('[UnityAds] Interstitial failed:', e);
        } finally {
            if (window.socket && (window.currentOnlineRoomId || window.currentRoomId)) {
                const rId = window.currentOnlineRoomId || window.currentRoomId;
                window.socket.emit('ad-playback-status', { roomId: rId, isShowing: false });
            }
        }
    }
}
window.playInterstitialAd = playInterstitialAd;
window.showZingInterstitialAd = playInterstitialAd;

async function showZingRewardedAd({ onReward, onFail }) {
    if (!navigator.onLine) {
        showAdToast('⚠️ No internet connection! Please connect to internet to watch video and earn tokens.');
        if (typeof onFail === 'function') {
            onFail({ reason: 'NO_INTERNET', message: 'No internet connection' });
        }
        return;
    }

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) {
        const { UnityAdsBridge } = window.Capacitor.Plugins;
        try {
            showAdToast('⏳ Loading video ad, please wait...', true);

            const result = await UnityAdsBridge.showRewarded({
                placementId: UnityAdsConfig.rewardedPlacement
            });

            if (result && result.rewarded) {
                showAdToast('🎉 Video completed! 100 Tokens credited to your account.', true);
                if (typeof onReward === 'function') {
                    onReward();
                }
            } else {
                showAdToast('⚠️ Video was not completed! Tokens were not added.');
                if (typeof onFail === 'function') {
                    onFail({ reason: 'DISMISSED_EARLY', message: 'Video dismissed early' });
                }
            }
        } catch (err) {
            console.warn('[UnityAds] Rewarded ad error:', err);
            showAdToast('⚠️ Failed to load video ad. Please try again.');
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

        const userAccepted = confirm('📺 Watch video ad to earn 100 Tokens?');
        if (userAccepted) {
            showAdToast('🎉 Video completed! 100 Tokens credited.', true);
            if (typeof onReward === 'function') onReward();
        } else {
            showAdToast('⚠️ Video cancelled. Tokens were not added.');
            if (typeof onFail === 'function') onFail({ reason: 'USER_CANCELLED' });
        }
    }
}
window.showZingRewardedAd = showZingRewardedAd;
