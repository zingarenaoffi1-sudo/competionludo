import os

path = "prepare-android.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

admob_meta_old = '{app_id}"/>\\n    </application>\''
admob_meta_new = '{app_id}"/>\\n        <meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="true"/>\\n    </application>\''

if admob_meta_old in content:
    content = content.replace(admob_meta_old, admob_meta_new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added DELAY_APP_MEASUREMENT_INIT")
else:
    print("Not found or already added")
