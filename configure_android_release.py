import os
import sys

print("Configuring Android build for Release and Firebase...")

# 1. Update root build.gradle
root_path = "build.gradle"
if os.path.exists(root_path):
    with open(root_path, "r", encoding="utf-8") as f:
        root = f.read()
    if "com.google.gms:google-services" not in root:
        root = root.replace("dependencies {", "dependencies {\n        classpath \"com.google.gms:google-services:4.4.2\"")
    if "org.jetbrains.kotlin:kotlin-stdlib" not in root:
        root += '\nallprojects { configurations.all { resolutionStrategy { force "org.jetbrains.kotlin:kotlin-stdlib:1.9.24"; force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.24"; force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.24" } } }\n'
    with open(root_path, "w", encoding="utf-8") as f:
        f.write(root)
    print("Root build.gradle updated.")

# 2. Update app/build.gradle
app_path = "app/build.gradle"
if os.path.exists(app_path):
    with open(app_path, "r", encoding="utf-8") as f:
        app = f.read()

    if "com.google.gms.google-services" not in app:
        app += '\napply plugin: "com.google.gms.google-services"\n'

    signing_config_block = """
android {
    signingConfigs {
        release {
            storeFile file("debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
"""
    if "signingConfigs.release" not in app:
        app += signing_config_block

    with open(app_path, "w", encoding="utf-8") as f:
        f.write(app)
    print("app/build.gradle updated with Release signing!")

print("Android configuration complete!")
