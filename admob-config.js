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
