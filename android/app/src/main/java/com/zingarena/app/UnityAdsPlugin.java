package com.zingarena.app;

import android.app.Activity;
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
import java.util.List;

@CapacitorPlugin(name = "UnityAdsBridge")
public class UnityAdsPlugin extends Plugin {
    private static final String TAG = "UnityAdsBridge";
    private static final String DEFAULT_GAME_ID = "800378570";
    private static boolean testMode = true;

    private static boolean isInitializing = false;
    private static final List<Runnable> pendingActions = new ArrayList<>();

    private BannerView bannerView = null;
    private FrameLayout bannerLayout = null;

    @Override
    public void load() {
        super.load();
        initSdk(getActivity(), DEFAULT_GAME_ID, testMode, null, null);
    }

    private synchronized void initSdk(Activity activity, String gameId, boolean testing, Runnable onComplete, Runnable onFailed) {
        if (UnityAds.isInitialized()) {
            if (onComplete != null) {
                new Handler(Looper.getMainLooper()).post(onComplete);
            }
            return;
        }

        if (onComplete != null) {
            synchronized (pendingActions) {
                pendingActions.add(onComplete);
            }
        }

        if (isInitializing) {
            return;
        }

        if (activity == null) {
            if (onFailed != null) {
                new Handler(Looper.getMainLooper()).post(onFailed);
            }
            return;
        }

        isInitializing = true;
        Log.d(TAG, "Initializing Unity Ads SDK with Game ID: " + gameId + ", testMode: " + testing);

        UnityAds.initialize(activity.getApplicationContext(), gameId, testing, new IUnityAdsInitializationListener() {
            @Override
            public void onInitializationComplete() {
                isInitializing = false;
                Log.d(TAG, "Unity Ads SDK initialized successfully!");

                preloadDefaultAds();

                synchronized (pendingActions) {
                    for (Runnable action : pendingActions) {
                        new Handler(Looper.getMainLooper()).post(action);
                    }
                    pendingActions.clear();
                }
            }

            @Override
            public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                isInitializing = false;
                Log.e(TAG, "Unity Ads initialization failed: " + error + " - " + message);

                synchronized (pendingActions) {
                    pendingActions.clear();
                }

                if (onFailed != null) {
                    new Handler(Looper.getMainLooper()).post(onFailed);
                }
            }
        });
    }

    private void preloadDefaultAds() {
        try {
            UnityAds.load("Rewarded_Android", null);
            UnityAds.load("Interstitial_Android", null);
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
        final String placementId = call.getString("placementId", "Banner_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;
        final String position = call.getString("position", "bottom");

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdk(activity, DEFAULT_GAME_ID, testMode, () -> {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (bannerLayout == null) {
                        bannerLayout = new FrameLayout(activity);
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

                    loadBannerInternal(activity, placementId, call, true);
                } catch (Exception e) {
                    Log.e(TAG, "Banner show exception: " + e.getMessage());
                    call.reject(e.getMessage());
                }
            });
        }, () -> call.reject("Unity Ads initialization failed before banner load"));
    }

    private void loadBannerInternal(Activity activity, String placementId, PluginCall call, boolean allowFallback) {
        if (bannerView != null) {
            bannerLayout.removeAllViews();
            bannerView.destroy();
            bannerView = null;
        }

        bannerView = new BannerView(activity, placementId, new UnityBannerSize(320, 50));
        bannerView.setListener(new BannerView.Listener() {
            @Override
            public void onBannerLoaded(BannerView bannerAdView) {
                Log.d(TAG, "Banner loaded successfully for placement: " + placementId);
                activity.runOnUiThread(() -> {
                    if (bannerLayout != null) {
                        bannerLayout.setVisibility(View.VISIBLE);
                        bannerLayout.bringToFront();
                    }
                });
                if (call != null && !call.isKeptAlive()) {
                    call.resolve(new JSObject().put("loaded", true));
                }
            }

            @Override
            public void onBannerClick(BannerView bannerAdView) {
                Log.d(TAG, "Banner clicked");
            }

            @Override
            public void onBannerFailedToLoad(BannerView bannerAdView, BannerErrorInfo errorInfo) {
                String errorMsg = errorInfo != null ? errorInfo.errorMessage : "Unknown";
                Log.w(TAG, "Banner failed to load for " + placementId + ": " + errorMsg);

                if (allowFallback && !"Banner_Android".equals(placementId)) {
                    activity.runOnUiThread(() -> loadBannerInternal(activity, "Banner_Android", call, false));
                } else if (call != null && !call.isKeptAlive()) {
                    call.resolve(new JSObject().put("loaded", false).put("error", errorMsg));
                }
            }

            @Override
            public void onBannerLeftApplication(BannerView bannerAdView) {
                Log.d(TAG, "Banner left application");
            }
        });

        bannerLayout.addView(bannerView);
        bannerView.load();
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
        final String placementId = call.getString("placementId", "Interstitial_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdk(activity, DEFAULT_GAME_ID, testMode, () -> {
            loadAndShowInterstitialInternal(activity, placementId, call, true);
        }, () -> {
            call.resolve(new JSObject().put("shown", false).put("error", "Not initialized"));
        });
    }

    private void loadAndShowInterstitialInternal(Activity activity, String placementId, PluginCall call, boolean allowFallback) {
        UnityAds.load(placementId, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String s) {
                activity.runOnUiThread(() -> {
                    UnityAds.show(activity, placementId, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                        @Override
                        public void onUnityAdsShowFailure(String pId, UnityAds.UnityAdsShowError error, String message) {
                            Log.w(TAG, "Interstitial show failed: " + message);
                            call.resolve(new JSObject().put("shown", false));
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
                Log.w(TAG, "Interstitial load failed for " + placementId + ": " + message);
                if (allowFallback && !"Interstitial_Android".equals(placementId)) {
                    loadAndShowInterstitialInternal(activity, "Interstitial_Android", call, false);
                } else {
                    call.resolve(new JSObject().put("shown", false).put("error", message));
                }
            }
        });
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        final String placementId = call.getString("placementId", "Rewarded_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdk(activity, DEFAULT_GAME_ID, testMode, () -> {
            loadAndShowRewardedInternal(activity, placementId, call, true);
        }, () -> {
            call.reject("Unity Ads failed to initialize");
        });
    }

    private void loadAndShowRewardedInternal(Activity activity, String placementId, PluginCall call, boolean allowFallback) {
        UnityAds.load(placementId, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String s) {
                activity.runOnUiThread(() -> {
                    UnityAds.show(activity, placementId, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
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
                                call.resolve(new JSObject().put("rewarded", false));
                            }
                        }
                    });
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String s, UnityAds.UnityAdsLoadError error, String message) {
                Log.w(TAG, "Rewarded load failed for " + placementId + ": " + message);
                if (allowFallback && !"Rewarded_Android".equals(placementId)) {
                    loadAndShowRewardedInternal(activity, "Rewarded_Android", call, false);
                } else {
                    call.reject("Load failed: " + message);
                }
            }
        });
    }
}
