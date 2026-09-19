import os
import re

def configure_gradle_release():
    # 1. Update android/build.gradle
    root_gradle = "android/build.gradle"
    if os.path.exists(root_gradle):
        with open(root_gradle, "r", encoding="utf-8") as f:
            root = f.read()
        if "com.google.gms:google-services" not in root:
            root = root.replace("dependencies {", "dependencies {\n        classpath \"com.google.gms:google-services:4.4.2\"")
        with open(root_gradle, "w", encoding="utf-8") as f:
            f.write(root)

    # 2. Update android/app/build.gradle
    app_gradle = "android/app/build.gradle"
    if os.path.exists(app_gradle):
        with open(app_gradle, "r", encoding="utf-8") as f:
            app = f.read()
        if "com.google.gms.google-services" not in app:
            app += '\napply plugin: "com.google.gms.google-services"\n'
        
        # Read environment variables for signing if set, else defaults
        k_pass = os.environ.get("KEYSTORE_PASSWORD", "android")
        k_alias = os.environ.get("KEY_ALIAS", "androiddebugkey")
        k_keypass = os.environ.get("KEY_PASSWORD", "android")

        if "signingConfigs.release" not in app:
            signing_cfg = f"""
android {{
    signingConfigs {{
        release {{
            storeFile file("debug.keystore")
            storePassword "{k_pass}"
            keyAlias "{k_alias}"
            keyPassword "{k_keypass}"
        }}
    }}
    buildTypes {{
        release {{
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }}
    }}
}}
"""
            app += signing_cfg
        with open(app_gradle, "w", encoding="utf-8") as f:
            f.write(app)
    print("Gradle and release signing configured successfully via prepare-android.py")

def main():
    manifest_path = "android/app/src/main/AndroidManifest.xml"
    if os.path.exists(manifest_path):
        app_id = os.environ.get("FINAL_ADMOB_ID", "ca-app-pub-6484628444475898~3321848589").strip()
        if "~" not in app_id or "/" in app_id:
            app_id = "ca-app-pub-6484628444475898~3321848589"
        with open(manifest_path, "r", encoding="utf-8") as f:
            content = f.read()
        admob_meta = f'\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="{app_id}"/>\n        <meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="true"/>\n    </application>'
        if "com.google.android.gms.ads.APPLICATION_ID" not in content:
            content = content.replace("</application>", admob_meta)
        perms = (
            '\n    <uses-permission android:name="android.permission.INTERNET"/>'
            '\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>'
            '\n    <application'
        )
        if "android.permission.INTERNET" not in content:
            content = content.replace("<application", perms)
        elif "android.permission.ACCESS_NETWORK_STATE" not in content:
            content = content.replace("<application", '\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>\n    <application')
        if 'android:hardwareAccelerated' not in content:
            content = content.replace('<application', '<application android:hardwareAccelerated="true"')
        with open(manifest_path, "w", encoding="utf-8") as f:
            f.write(content)

    strings_path = "android/app/src/main/res/values/strings.xml"
    if os.path.exists(strings_path):
        with open(strings_path, "r", encoding="utf-8") as f:
            strings_xml = f.read()
        strings_xml = re.sub(r'<string name="app_name">[^<]*</string>', '<string name="app_name">Ludo</string>', strings_xml)
        strings_xml = re.sub(r'<string name="title_activity_main">[^<]*</string>', '<string name="title_activity_main">Ludo</string>', strings_xml)
        fallback_strings = (
            '\n    <string name="default_web_client_id">554089835021-3idmc196ket8k4buadpj7d7oobq1ka4f.apps.googleusercontent.com</string>'
            '\n    <string name="google_app_id">1:554089835021:android:2052c67e88561a73d78344</string>'
            '\n    <string name="gcm_defaultSenderId">554089835021</string>'
            '\n    <string name="google_api_key">AIzaSyC-u0_O8nprciybxZ7uXD1EEBo4w4x9Dng</string>'
            '\n    <string name="firebase_database_url">https://ludo-b59a8.firebaseio.com</string>'
            '\n</resources>'
        )
        if "default_web_client_id" not in strings_xml:
            strings_xml = strings_xml.replace("</resources>", fallback_strings)
        with open(strings_path, "w", encoding="utf-8") as f:
            f.write(strings_xml)

    main_act_path = "android/app/src/main/java/com/zingarena/app/MainActivity.java"
    if os.path.exists(main_act_path):
        main_act_content = """package com.zingarena.app;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
}"""
        with open(main_act_path, "w", encoding="utf-8") as f:
            f.write(main_act_content)

    vars_path = "android/variables.gradle"
    if os.path.exists(vars_path):
        with open(vars_path, "r", encoding="utf-8") as f:
            vars_content = f.read()
        if "rgcfaIncludeGoogle" not in vars_content:
            vars_content = vars_content.replace("ext {", "ext {\n    rgcfaIncludeGoogle = true\n    rgcfaIncludeFacebook = false")
            with open(vars_path, "w", encoding="utf-8") as f:
                f.write(vars_content)

    # Configure release signing & gradle plugins
    configure_gradle_release()

if __name__ == "__main__":
    main()
