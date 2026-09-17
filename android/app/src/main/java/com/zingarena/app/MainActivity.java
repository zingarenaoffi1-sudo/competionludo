package com.zingarena.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e("LudoCrashProtection", "Crash safely intercepted on thread: " + thread.getName(), throwable);
        });
        super.onCreate(savedInstanceState);
    }
}
