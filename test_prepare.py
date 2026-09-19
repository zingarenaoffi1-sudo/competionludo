import re

with open("android/app/build.gradle", "r", encoding="utf-8") as f:
    app = f.read()

# Let's clean any previous signingConfigs or duplicate blocks
# Remove any existing signingConfigs block
app = re.sub(r'signingConfigs\s*\{.*?\n    \}', '', app, flags=re.DOTALL)
# Remove any duplicate android { } wrapper at bottom if added earlier
app = re.sub(r'android\s*\{\s*signingConfigs\s*\{.*?\}\s*buildTypes\s*\{.*?\}\s*\}', '', app, flags=re.DOTALL)

# Clean buildTypes release to not have duplicate signingConfig
app = re.sub(r'signingConfig\s+signingConfigs\.\w+', '', app)

# Now add clean signingConfigs and set buildTypes
signing_code = """
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword "zingarena123"
            keyAlias "zingarena_release"
            keyPassword "zingarena123"
        }
        debug {
            storeFile file("release.keystore")
            storePassword "zingarena123"
            keyAlias "zingarena_release"
            keyPassword "zingarena123"
        }
    }
"""

if "android {" in app:
    app = app.replace("android {", "android {" + signing_code, 1)

# Ensure release buildType uses signingConfigs.release
if "release {" in app:
    app = app.replace("release {", "release {\n            signingConfig signingConfigs.release")

with open("android/app/build.gradle", "w", encoding="utf-8") as f:
    f.write(app)

print("Test transform done!")
