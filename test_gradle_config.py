import re

with open("android/app/build.gradle", "r") as f:
    text = f.read()

# Replace signingConfigs and buildTypes
new_block = """
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword "zingarena123"
            keyAlias "zingarena_release"
            keyPassword "zingarena123"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
"""
text = re.sub(r'signingConfigs\s*\{.*?\}\s*buildTypes\s*\{.*?\}', new_block, text, flags=re.DOTALL)
with open("android/app/build.gradle", "w") as f:
    f.write(text)

print("Modified android/app/build.gradle successfully")
