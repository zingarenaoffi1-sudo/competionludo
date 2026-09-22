package com.zingarena.app;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
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
    private static final boolean TEST_MODE = false;

    private static boolean isInitialized = false;
    private BannerView bannerView = null;
    private FrameLayout bannerLayout = null;

    @Override
    public void load() {
        super.load();
        initSdkIfNeeded();
    }

    private synchronized void initSdkIfNeeded() {
        if (isInitialized) return;
        Activity activity = getActivity();
        if (activity == null) return;

        UnityAds.initialize(activity.getApplicationContext(), GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {
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
    public void showBanner(PluginCall call) {
        final String placementId = call.getString("placementId", "BP_Banner_Android");
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                initSdkIfNeeded();
                if (bannerLayout == null) {
                    bannerLayout = new FrameLayout(activity);
                    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            Gravity.TOP | Gravity.CENTER_HORIZONTAL
                    );
                    activity.addContentView(bannerLayout, params);
                }

                if (bannerView != null) {
                    bannerLayout.removeAllViews();
                    bannerView.destroy();
                    bannerView = null;
                }

                bannerView = new BannerView(activity, placementId, new UnityBannerSize(320, 50));
                bannerView.setListener(new BannerView.IListener() {
                    @Override
                    public void onBannerLoaded(BannerView bannerAdView) {
                        Log.d(TAG, "Banner loaded successfully");
                    }

                    @Override
                    public void onBannerClick(BannerView bannerAdView) {
                        Log.d(TAG, "Banner clicked");
                    }

                    @Override
                    public void onBannerFailedToLoad(BannerView bannerAdView, BannerErrorInfo errorInfo) {
                        Log.w(TAG, "Banner failed to load: " + errorInfo.errorMessage);
                    }

                    @Override
                    public void onBannerLeftApplication(BannerView bannerAdView) {
                        Log.d(TAG, "Banner left application");
                    }
                });

                bannerLayout.addView(bannerView);
                bannerView.load();
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Banner show error: " + e.getMessage());
                call.reject(e.getMessage());
            }
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
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdkIfNeeded();

        UnityAds.load(placementId, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String s) {
                activity.runOnUiThread(() -> {
                    UnityAds.show(activity, placementId, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                        @Override
                        public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                            Log.w(TAG, "Interstitial show failed: " + message);
                            call.resolve(new JSObject().put("shown", false));
                        }

                        @Override
                        public void onUnityAdsShowStart(String placementId) {
                            Log.d(TAG, "Interstitial ad started");
                        }

                        @Override
                        public void onUnityAdsShowClick(String placementId) {
                            Log.d(TAG, "Interstitial ad clicked");
                        }

                        @Override
                        public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
                            Log.d(TAG, "Interstitial completed");
                            call.resolve(new JSObject().put("shown", true));
                        }
                    });
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String s, UnityAds.UnityAdsLoadError error, String message) {
                Log.w(TAG, "Interstitial load failed: " + message);
                call.resolve(new JSObject().put("shown", false));
            }
        });
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        final String placementId = call.getString("placementId", "BP_Rewarded_Android");
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        initSdkIfNeeded();

        UnityAds.load(placementId, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String s) {
                activity.runOnUiThread(() -> {
                    UnityAds.show(activity, placementId, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                        @Override
                        public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                            Log.w(TAG, "Rewarded show failed: " + message);
                            call.resolve(new JSObject().put("rewarded", false));
                        }

                        @Override
                        public void onUnityAdsShowStart(String placementId) {
                            Log.d(TAG, "Rewarded ad started");
                        }

                        @Override
                        public void onUnityAdsShowClick(String placementId) {
                            Log.d(TAG, "Rewarded ad clicked");
                        }

                        @Override
                        public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
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
                Log.w(TAG, "Rewarded load failed: " + message);
                call.reject("Load failed: " + message);
            }
        });
    }
}
