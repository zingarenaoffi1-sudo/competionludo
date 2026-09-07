// =============================================================================
// ZINGARENA LUDO - CENTRAL ADMOB CONFIGURATION
// Aap apni AdMob IDs is file me asani se badal sakte hain!
// =============================================================================

const AdMobConfig = {
    // 0. Google AdMob App ID (With '~' tilde - Used in Android APK Manifest)
    // Testing App ID: 'ca-app-pub-3940256099942544~3347511713'
    appId: 'ca-app-pub-3940256099942544~3347511713',

    // 1. Banner Ad ID (Shown at the top or bottom of screens)
    // Testing ID: 'ca-app-pub-3940256099942544/9214589741'
    bannerAdId: 'ca-app-pub-3940256099942544/9214589741',

    // 2. Interstitial Full-Screen Ad ID (Shown after matches)
    // Testing ID: 'ca-app-pub-3940256099942544/1033173712'
    interstitialAdId: 'ca-app-pub-3940256099942544/1033173712',

    // 3. Rewarded Video Ad ID (Shown when unlocking features or tokens)
    // Testing ID: 'ca-app-pub-3940256099942544/5224354917'
    rewardedAdId: 'ca-app-pub-3940256099942544/5224354917',

    // Set to false when deploying your real production app to Google Play Store!
    isTesting: true
};

window.AdMobConfig = AdMobConfig;

// =============================================================================
// TOAST NOTIFICATION UTILITY
// =============================================================================
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

// =============================================================================
// INTERNET-AWARE BANNER AD CONTROLLER
// Only loads and displays when Internet is ON. Never freezes main thread (No ANR).
// =============================================================================
let _zingBannerInitialized = false;
let _zingBannerVisible = false;

function initZingBannerAd(options = {}) {
    const delay = (typeof options.delay === 'number') ? options.delay : 2000;

    const tryShowBanner = async () => {
        if (!navigator.onLine) {
            console.log("[AdMob] Internet is currently OFF. Banner skipped.");
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
                console.log("[AdMob] Banner loaded successfully with active internet.");
            } else {
                const el = document.getElementById('test-banner');
                if (el && navigator.onLine) el.style.display = 'flex';
            }
        } catch (e) {
            console.log("[AdMob] Banner safe skip:", e);
        }
    };

    // If internet is off right now, keep hidden
    if (!navigator.onLine) {
        hideZingBannerAd();
    } else {
        setTimeout(tryShowBanner, delay);
    }

    // Auto-listen for network state changes
    window.removeEventListener('online', _handleNetworkOnline);
    window.removeEventListener('offline', _handleNetworkOffline);
    window.addEventListener('online', _handleNetworkOnline);
    window.addEventListener('offline', _handleNetworkOffline);
}

function _handleNetworkOnline() {
    console.log("[AdMob] Internet connection restored! Showing banner ad.");
    initZingBannerAd({ delay: 600 });
}

function _handleNetworkOffline() {
    console.log("[AdMob] Internet connection lost! Hiding banner ad.");
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

// =============================================================================
// REWARDED VIDEO AD CONTROLLER (1 GOTI UNLOCK & TOKENS)
// Strict Rule: If Internet is OFF, it WILL NOT WORK and WILL NOT UNLOCK GOTI!
// =============================================================================
async function showZingRewardedAd({ onReward, onFail }) {
    // 1. STRICT INTERNET CHECK
    if (!navigator.onLine) {
        showAdToast("⚠️ इंटरनेट कनेक्शन बंद है! वीडियो देखने और गोटी निकालने के लिए इंटरनेट ऑन करें।");
        if (typeof onFail === 'function') {
            onFail({ reason: 'NO_INTERNET', message: 'No internet connection' });
        }
        return;
    }

    // 2. NATIVE CAPACITOR ADMOB
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        const { AdMob } = window.Capacitor.Plugins;
        const rewardedId = (window.AdMobConfig && window.AdMobConfig.rewardedAdId) || 'ca-app-pub-3940256099942544/5224354917';
        const isTesting = (window.AdMobConfig && typeof window.AdMobConfig.isTesting === 'boolean') ? window.AdMobConfig.isTesting : true;

        let rewardGranted = false;

        try {
            showAdToast("⏳ वीडियो लोड हो रहा है, कृपया प्रतीक्षा करें...", true);

            await AdMob.prepareRewardVideoAd({
                adId: rewardedId,
                isTesting: isTesting
            });

            // Listen for successful reward
            const rewardHandle = await AdMob.addListener('onRewardedVideoAdReward', () => {
                rewardGranted = true;
                showAdToast("🎉 शाबाश! वीडियो पूरा देखा गया, 1 गोटी अनलॉक हुई!", true);
                if (typeof onReward === 'function') {
                    onReward();
                }
            });

            // Listen for ad dismissal
            const dismissHandle = await AdMob.addListener('onRewardedVideoAdDismissed', () => {
                if (rewardHandle && rewardHandle.remove) rewardHandle.remove();
                if (dismissHandle && dismissHandle.remove) dismissHandle.remove();

                if (!rewardGranted) {
                    showAdToast("⚠️ वीडियो पूरा नहीं देखा गया! गोटी अनलॉक नहीं हुई।");
                    if (typeof onFail === 'function') {
                        onFail({ reason: 'DISMISSED_EARLY', message: 'Video was dismissed before completion' });
                    }
                }
            });

            await AdMob.showRewardVideoAd();

        } catch (err) {
            console.warn("[AdMob] Rewarded Ad Error:", err);
            showAdToast("⚠️ वीडियो विज्ञापन लोड नहीं हो सका। कृपया इंटरनेट चेक करें।");
            if (typeof onFail === 'function') {
                onFail({ reason: 'AD_FAILED', message: err.message || 'Ad load failed' });
            }
        }
    } else {
        // Browser / Web Preview Simulation
        if (!navigator.onLine) {
            showAdToast("⚠️ इंटरनेट बंद है! वीडियो देखने के लिए कृपया इंटरनेट चालू करें।");
            if (typeof onFail === 'function') onFail({ reason: 'NO_INTERNET' });
            return;
        }

        const userAccepted = confirm("📺 [Video Ad Preview] क्या आप 1 गोटी बाहर निकालने के लिए वीडियो विज्ञापन देखना चाहते हैं?");
        if (userAccepted) {
            showAdToast("🎉 वीडियो देखा गया! 1 गोटी बाहर निकली!", true);
            if (typeof onReward === 'function') onReward();
        } else {
            showAdToast("⚠️ वीडियो रद्द कर दिया गया। गोटी अनलॉक नहीं हुई।");
            if (typeof onFail === 'function') onFail({ reason: 'USER_CANCELLED' });
        }
    }
}
window.showZingRewardedAd = showZingRewardedAd;
