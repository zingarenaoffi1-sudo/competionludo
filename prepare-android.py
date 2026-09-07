import os
import re

def main():
    print("Running prepare-android.py...")
    
    # 1. AndroidManifest.xml
    manifest_path = "android/app/src/main/AndroidManifest.xml"
    if os.path.exists(manifest_path):
        app_id = os.environ.get("FINAL_ADMOB_ID", "ca-app-pub-3940256099942544~3347511713")
        with open(manifest_path, "r", encoding="utf-8") as f:
            content = f.read()

        admob_meta = f'\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="{app_id}"/>\n    </application>'
        if "com.google.android.gms.ads.APPLICATION_ID" not in content:
            content = content.replace("</application>", admob_meta)

        perms = '\n    <uses-permission android:name="android.permission.INTERNET"/>\n    <application'
        if "android.permission.INTERNET" not in content:
            content = content.replace("<application", perms)

        with open(manifest_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated AndroidManifest.xml successfully.")

    # 2. strings.xml -> App Name and Firebase fallback strings to prevent Resources$NotFoundException crashes
    strings_path = "android/app/src/main/res/values/strings.xml"
    if os.path.exists(strings_path):
        with open(strings_path, "r", encoding="utf-8") as f:
            strings_xml = f.read()

        strings_xml = re.sub(r'<string name="app_name">[^<]*</string>', '<string name="app_name">ZingArena</string>', strings_xml)
        strings_xml = re.sub(r'<string name="title_activity_main">[^<]*</string>', '<string name="title_activity_main">ZingArena</string>', strings_xml)

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
        print("Updated strings.xml successfully.")

    # 3. MainActivity.java -> Standard Capacitor BridgeActivity (Firebase is auto-initialized by Google Services plugin)
    main_act_path = "android/app/src/main/java/com/zingarena/app/MainActivity.java"
    if os.path.exists(main_act_path):
        main_act_content = """package com.zingarena.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
"""
        with open(main_act_path, "w", encoding="utf-8") as f:
            f.write(main_act_content)
        print("Updated MainActivity.java to clean BridgeActivity.")

    print("prepare-android.py completed.")

if __name__ == "__main__":
    main()
