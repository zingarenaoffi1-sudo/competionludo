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

@CapacitorPlugin(name = "UnityAdsBridge")
public class UnityAdsPlugin extends Plugin {
    private static final String TAG = "UnityAdsBridge";
    private static final String GAME_ID = "800378570";
    private static boolean testMode = true;

    private static boolean isInitialized = false;
    private BannerView bannerView = null;
    private FrameLayout bannerLayout = null;

    @Override
    public void load() {
        super.load();
        initSdkIfNeeded(getActivity(), GAME_ID, testMode);
    }

    private synchronized void initSdkIfNeeded(Activity activity, String gameId, boolean testing) {
        if (isInitialized) return;
        if (activity == null) return;

        UnityAds.initialize(activity.getApplicationContext(), gameId, testing, new IUnityAdsInitializationListener() {
            @Override
            public void onInitializationComplete() {
                Log.d(TAG, "Unity Ads initialized successfully!");
                isInitialized = true;
            }

            @Override
            public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                Log.e(TAG, "Unity Ads initialization failed: " + error + " - " + message);
            }
        });
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        String gameId = call.getString("gameId", GAME_ID);
        testMode = call.getBoolean("isTesting", true);
        initSdkIfNeeded(getActivity(), gameId, testMode);
        call.resolve(new JSObject().put("initialized", true));
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        final String placementId = call.getString("placementId", "BP_Banner_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                initSdkIfNeeded(activity, GAME_ID, testMode);
                if (bannerLayout == null) {
                    bannerLayout = new FrameLayout(activity);
                    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            Gravity.TOP | Gravity.CENTER_HORIZONTAL
                    );
                    activity.addContentView(bannerLayout, params);
                }

                bannerLayout.setVisibility(View.VISIBLE);
                bannerLayout.bringToFront();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    bannerLayout.setElevation(9999f);
                }

                loadBannerWithFallback(activity, placementId, call, true);
            } catch (Exception e) {
                Log.e(TAG, "Banner show error: " + e.getMessage());
                call.reject(e.getMessage());
            }
        });
    }

    private void loadBannerWithFallback(Activity activity, String placementId, PluginCall call, boolean allowFallback) {
        if (bannerView != null) {
            bannerLayout.removeAllViews();
            bannerView.destroy();
            bannerView = null;
        }

        bannerView = new BannerView(activity, placementId, new UnityBannerSize(320, 50));
        bannerView.setListener(new BannerView.Listener() {
            @Override
            public void onBannerLoaded(BannerView bannerAdView) {
                Log.d(TAG, "Banner loaded successfully: " + placementId);
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
                if (allowFallback && "BP_Banner_Android".equals(placementId)) {
                    Log.d(TAG, "Retrying banner with fallback placement 'Banner_Android'");
                    activity.runOnUiThread(() -> loadBannerWithFallback(activity, "Banner_Android", call, false));
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
                call.resolve();
            } catch (Exception e) {
                call.resolve();
            }
        });
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        final String placementId = call.getString("placementId", "BP_Interstitial_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdkIfNeeded(activity, GAME_ID, testMode);
        loadAndShowInterstitial(activity, placementId, call, true);
    }

    private void loadAndShowInterstitial(Activity activity, String placementId, PluginCall call, boolean allowFallback) {
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
                            Log.d(TAG, "Interstitial ad started");
                        }

                        @Override
                        public void onUnityAdsShowClick(String pId) {
                            Log.d(TAG, "Interstitial ad clicked");
                        }

                        @Override
                        public void onUnityAdsShowComplete(String pId, UnityAds.UnityAdsShowCompletionState state) {
                            Log.d(TAG, "Interstitial completed");
                            call.resolve(new JSObject().put("shown", true));
                        }
                    });
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String s, UnityAds.UnityAdsLoadError error, String message) {
                Log.w(TAG, "Interstitial load failed for " + placementId + ": " + message);
                if (allowFallback && "BP_Interstitial_Android".equals(placementId)) {
                    Log.d(TAG, "Retrying interstitial with fallback placement 'Interstitial_Android'");
                    loadAndShowInterstitial(activity, "Interstitial_Android", call, false);
                } else {
                    call.resolve(new JSObject().put("shown", false));
                }
            }
        });
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        final String placementId = call.getString("placementId", "BP_Rewarded_Android");
        final boolean testing = call.getBoolean("isTesting", true);
        testMode = testing;
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdkIfNeeded(activity, GAME_ID, testMode);
        loadAndShowRewarded(activity, placementId, call, true);
    }

    private void loadAndShowRewarded(Activity activity, String placementId, PluginCall call, boolean allowFallback) {
        UnityAds.load(placementId, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String s) {
                activity.runOnUiThread(() -> {
                    UnityAds.show(activity, placementId, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                        @Override
                        public void onUnityAdsShowFailure(String pId, UnityAds.UnityAdsShowError error, String message) {
                            Log.w(TAG, "Rewarded show failed: " + message);
                            call.resolve(new JSObject().put("rewarded", false));
                        }

                        @Override
                        public void onUnityAdsShowStart(String pId) {
                            Log.d(TAG, "Rewarded ad started");
                        }

                        @Override
                        public void onUnityAdsShowClick(String pId) {
                            Log.d(TAG, "Rewarded ad clicked");
                        }

                        @Override
                        public void onUnityAdsShowComplete(String pId, UnityAds.UnityAdsShowCompletionState state) {
                            if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) {
                                Log.d(TAG, "Rewarded ad completed successfully! Granting reward.");
                                call.resolve(new JSObject().put("rewarded", true));
                            } else {
                                Log.d(TAG, "Rewarded ad skipped or incomplete");
                                call.resolve(new JSObject().put("rewarded", false));
                            }
                        }
                    });
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String s, UnityAds.UnityAdsLoadError error, String message) {
                Log.w(TAG, "Rewarded load failed for " + placementId + ": " + message);
                if (allowFallback && "BP_Rewarded_Android".equals(placementId)) {
                    Log.d(TAG, "Retrying rewarded with fallback placement 'Rewarded_Android'");
                    loadAndShowRewarded(activity, "Rewarded_Android", call, false);
                } else {
                    call.reject("Load failed: " + message);
                }
            }
        });
    }
}
