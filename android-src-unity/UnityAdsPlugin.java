package com.zingarena.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsShowOptions;
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "UnityAdsBridge")
public class UnityAdsPlugin extends Plugin {
    private static final String TAG = "UnityAdsBridge";
    private static final String DEFAULT_GAME_ID = "800378570";
    private static final String TEST_FALLBACK_GAME_ID = "1486550";
    private static boolean testMode = true;

    private static boolean isInitializing = false;
    private static final List<Runnable> pendingSuccessActions = new ArrayList<>();
    private static final List<Runnable> pendingFailedActions = new ArrayList<>();

    private BannerView bannerView = null;
    private FrameLayout bannerLayout = null;

    @Override
    public void load() {
        super.load();
        Activity activity = getActivity();
        if (activity != null) {
            initSdk(activity, DEFAULT_GAME_ID, testMode, null, null);
        }
    }

    private synchronized void initSdk(Activity activity, String gameId, boolean testing, Runnable onComplete, Runnable onFailed) {
        if (UnityAds.isInitialized()) {
            if (onComplete != null) {
                new Handler(Looper.getMainLooper()).post(onComplete);
            }
            return;
        }

        if (onComplete != null) {
            synchronized (pendingSuccessActions) {
                pendingSuccessActions.add(onComplete);
            }
        }
        if (onFailed != null) {
            synchronized (pendingFailedActions) {
                pendingFailedActions.add(onFailed);
            }
        }

        if (isInitializing) {
            return;
        }

        if (activity == null) {
            dispatchInitFailure("Activity is null during Unity Ads init");
            return;
        }

        isInitializing = true;
        final String targetGameId = (gameId != null && !gameId.trim().isEmpty()) ? gameId.trim() : DEFAULT_GAME_ID;
        Log.i(TAG, "Initializing Unity Ads SDK with Game ID: [" + targetGameId + "], testMode=" + testing);

        UnityAds.initialize(activity.getApplicationContext(), targetGameId, testing, new IUnityAdsInitializationListener() {
            @Override
            public void onInitializationComplete() {
                isInitializing = false;
                Log.i(TAG, "Unity Ads initialized successfully for Game ID: " + targetGameId);
                preloadDefaultAds();
                dispatchInitSuccess();
            }

            @Override
            public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                isInitializing = false;
                Log.e(TAG, "Unity Ads init failed for Game ID [" + targetGameId + "]: " + error + " (" + message + ")");
                dispatchInitFailure("Unity Ads init failed: " + error + " - " + message);
            }
        });
    }

    private void dispatchInitSuccess() {
        synchronized (pendingSuccessActions) {
            for (Runnable action : pendingSuccessActions) {
                new Handler(Looper.getMainLooper()).post(action);
            }
            pendingSuccessActions.clear();
        }
        synchronized (pendingFailedActions) {
            pendingFailedActions.clear();
        }
    }

    private void dispatchInitFailure(String reason) {
        Log.e(TAG, "dispatchInitFailure: " + reason);
        synchronized (pendingFailedActions) {
            for (Runnable action : pendingFailedActions) {
                new Handler(Looper.getMainLooper()).post(action);
            }
            pendingFailedActions.clear();
        }
        synchronized (pendingSuccessActions) {
            pendingSuccessActions.clear();
        }
    }

    private void preloadDefaultAds() {
        try {
            UnityAds.load("BP_Rewarded_Android", null);
            UnityAds.load("Rewarded_Android", null);
            UnityAds.load("rewardedVideo", null);
            UnityAds.load("BP_Interstitial_Android", null);
            UnityAds.load("Interstitial_Android", null);
            UnityAds.load("video", null);
        } catch (Exception e) {
            Log.w(TAG, "Preload notice: " + e.getMessage());
        }
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        String gameId = call.getString("gameId", DEFAULT_GAME_ID);
        testMode = call.getBoolean("isTesting", true);
        initSdk(getActivity(), gameId, testMode,
            () -> call.resolve(new JSObject().put("initialized", true)),
            () -> call.reject("Failed to initialize Unity Ads")
        );
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        final String gameId = call.getString("gameId", DEFAULT_GAME_ID);
        final String requestedPlacement = call.getString("placementId", "BP_Banner_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;
        final String position = call.getString("position", "bottom");

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdk(activity, gameId, testMode, () -> {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (bannerLayout == null) {
                        bannerLayout = new FrameLayout(activity);
                        bannerLayout.setBackgroundColor(Color.TRANSPARENT);
                        int gravity = "top".equalsIgnoreCase(position) ? (Gravity.TOP | Gravity.CENTER_HORIZONTAL) : (Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
                        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.WRAP_CONTENT,
                                gravity
                        );
                        activity.addContentView(bannerLayout, params);
                    }

                    bannerLayout.setVisibility(View.VISIBLE);
                    bannerLayout.bringToFront();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        bannerLayout.setElevation(9999f);
                    }

                    List<String> candidates = buildCandidateList(requestedPlacement, new String[]{"BP_Banner_Android", "Banner_Android", "banner", "bannerAndroid"});
                    tryLoadBannerCandidates(activity, candidates, 0, position, call);
                } catch (Exception e) {
                    Log.e(TAG, "Banner show exception: " + e.getMessage());
                    call.reject(e.getMessage());
                }
            });
        }, () -> call.reject("Unity Ads initialization failed before banner load"));
    }

    private void tryLoadBannerCandidates(Activity activity, List<String> candidates, int index, String position, PluginCall call) {
        if (index >= candidates.size()) {
            Log.w(TAG, "All banner placement candidates failed to load.");
            if (call != null && !call.isKeptAlive()) {
                call.resolve(new JSObject().put("loaded", false).put("error", "No fill across candidate placements"));
            }
            return;
        }

        final String placement = candidates.get(index);
        Log.i(TAG, "Attempting banner load with placement: " + placement + " (" + (index + 1) + "/" + candidates.size() + ")");

        activity.runOnUiThread(() -> {
            if (bannerView != null) {
                if (bannerLayout != null) bannerLayout.removeAllViews();
                bannerView.destroy();
                bannerView = null;
            }

            bannerView = new BannerView(activity, placement, new UnityBannerSize(320, 50));
            if (bannerLayout != null) {
                bannerLayout.removeAllViews();
                int gravity = "top".equalsIgnoreCase(position) ? (Gravity.TOP | Gravity.CENTER_HORIZONTAL) : (Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
                FrameLayout.LayoutParams childParams = new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        gravity
                );
                bannerLayout.addView(bannerView, childParams);
                bannerLayout.setVisibility(View.VISIBLE);
                bannerLayout.bringToFront();
            }

            bannerView.setListener(new BannerView.Listener() {
                @Override
                public void onBannerLoaded(BannerView bannerAdView) {
                    Log.i(TAG, "Banner ad successfully loaded and showing for placement: " + placement);
                    activity.runOnUiThread(() -> {
                        if (bannerLayout != null) {
                            bannerLayout.setVisibility(View.VISIBLE);
                            bannerLayout.bringToFront();
                            bannerLayout.requestLayout();
                        }
                    });
                    if (call != null && !call.isKeptAlive()) {
                        call.resolve(new JSObject().put("loaded", true).put("placementId", placement));
                    }
                }

                @Override
                public void onBannerClick(BannerView bannerAdView) {
                    Log.d(TAG, "Banner clicked: " + placement);
                }

                @Override
                public void onBannerFailedToLoad(BannerView bannerAdView, BannerErrorInfo errorInfo) {
                    String errorMsg = errorInfo != null ? errorInfo.errorMessage : "Unknown";
                    Log.w(TAG, "Banner placement " + placement + " failed to load: " + errorMsg);
                    activity.runOnUiThread(() -> tryLoadBannerCandidates(activity, candidates, index + 1, position, call));
                }

                @Override
                public void onBannerLeftApplication(BannerView bannerAdView) {
                    Log.d(TAG, "Banner left application");
                }
            });

            bannerView.load();
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                if (bannerView != null) {
                    bannerView.destroy();
                    bannerView = null;
                }
                if (bannerLayout != null) {
                    bannerLayout.removeAllViews();
                    bannerLayout.setVisibility(View.GONE);
                }
            } catch (Exception ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        final String gameId = call.getString("gameId", DEFAULT_GAME_ID);
        final String requestedPlacement = call.getString("placementId", "BP_Interstitial_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdk(activity, gameId, testMode, () -> {
            List<String> candidates = buildCandidateList(requestedPlacement, new String[]{"BP_Interstitial_Android", "Interstitial_Android", "video", "interstitial"});
            tryLoadAndShowInterstitialCandidates(activity, candidates, 0, call);
        }, () -> {
            call.resolve(new JSObject().put("shown", false).put("error", "Not initialized"));
        });
    }

    private void tryLoadAndShowInterstitialCandidates(Activity activity, List<String> candidates, int index, PluginCall call) {
        if (index >= candidates.size()) {
            Log.w(TAG, "All interstitial placement candidates failed to load");
            call.resolve(new JSObject().put("shown", false).put("error", "No fill across candidate placements"));
            return;
        }

        final String placement = candidates.get(index);
        Log.d(TAG, "Loading interstitial: " + placement + " (" + (index + 1) + "/" + candidates.size() + ")");

        UnityAds.load(placement, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String s) {
                activity.runOnUiThread(() -> {
                    UnityAds.show(activity, placement, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                        @Override
                        public void onUnityAdsShowFailure(String pId, UnityAds.UnityAdsShowError error, String message) {
                            Log.w(TAG, "Interstitial show failed: " + message);
                            call.resolve(new JSObject().put("shown", false).put("error", message));
                        }

                        @Override
                        public void onUnityAdsShowStart(String pId) {
                            Log.d(TAG, "Interstitial ad started: " + pId);
                        }

                        @Override
                        public void onUnityAdsShowClick(String pId) {
                            Log.d(TAG, "Interstitial ad clicked");
                        }

                        @Override
                        public void onUnityAdsShowComplete(String pId, UnityAds.UnityAdsShowCompletionState state) {
                            Log.d(TAG, "Interstitial completed with state: " + state);
                            call.resolve(new JSObject().put("shown", true));
                        }
                    });
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String s, UnityAds.UnityAdsLoadError error, String message) {
                Log.w(TAG, "Interstitial placement " + placement + " failed: " + message);
                activity.runOnUiThread(() -> tryLoadAndShowInterstitialCandidates(activity, candidates, index + 1, call));
            }
        });
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        final String gameId = call.getString("gameId", DEFAULT_GAME_ID);
        final String requestedPlacement = call.getString("placementId", "BP_Rewarded_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdk(activity, gameId, testMode, () -> {
            List<String> candidates = buildCandidateList(requestedPlacement, new String[]{"BP_Rewarded_Android", "Rewarded_Android", "rewardedVideo", "rewarded"});
            tryLoadAndShowRewardedCandidates(activity, candidates, 0, call);
        }, () -> {
            call.reject("Unity Ads failed to initialize");
        });
    }

    private void tryLoadAndShowRewardedCandidates(Activity activity, List<String> candidates, int index, PluginCall call) {
        if (index >= candidates.size()) {
            Log.w(TAG, "All rewarded placement candidates failed to load");
            call.reject("Ad failed to load: No ad inventory available. Unity Dashboard me 'Force test mode ON' check karein.");
            return;
        }

        final String placement = candidates.get(index);
        Log.d(TAG, "Loading rewarded ad: " + placement + " (" + (index + 1) + "/" + candidates.size() + ")");

        UnityAds.load(placement, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String s) {
                activity.runOnUiThread(() -> {
                    UnityAds.show(activity, placement, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                        @Override
                        public void onUnityAdsShowFailure(String pId, UnityAds.UnityAdsShowError error, String message) {
                            Log.w(TAG, "Rewarded show failed: " + message);
                            call.resolve(new JSObject().put("rewarded", false).put("error", message));
                        }

                        @Override
                        public void onUnityAdsShowStart(String pId) {
                            Log.d(TAG, "Rewarded ad started: " + pId);
                        }

                        @Override
                        public void onUnityAdsShowClick(String pId) {
                            Log.d(TAG, "Rewarded ad clicked");
                        }

                        @Override
                        public void onUnityAdsShowComplete(String pId, UnityAds.UnityAdsShowCompletionState state) {
                            if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) {
                                Log.d(TAG, "Rewarded ad COMPLETED. Reward granted.");
                                call.resolve(new JSObject().put("rewarded", true));
                            } else {
                                Log.d(TAG, "Rewarded ad skipped or unfinished: " + state);
                                call.resolve(new JSObject().put("rewarded", false).put("reason", "SKIPPED"));
                            }
                        }
                    });
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String s, UnityAds.UnityAdsLoadError error, String message) {
                Log.w(TAG, "Rewarded placement " + placement + " failed: " + message);
                activity.runOnUiThread(() -> tryLoadAndShowRewardedCandidates(activity, candidates, index + 1, call));
            }
        });
    }

    private List<String> buildCandidateList(String primary, String[] fallbacks) {
        Set<String> set = new LinkedHashSet<>();
        if (primary != null && !primary.trim().isEmpty()) {
            set.add(primary.trim());
        }
        for (String fb : fallbacks) {
            if (fb != null && !fb.trim().isEmpty()) {
                set.add(fb.trim());
            }
        }
        return new ArrayList<>(set);
    }
}
