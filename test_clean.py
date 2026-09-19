content = """apply plugin: 'com.android.application'

android {
    namespace "com.zingarena.app"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.zingarena.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }
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
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
        debug {
            signingConfig signingConfigs.debug
        }
    }
}

repositories {
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
"""

with open("android/app/build.gradle", "w", encoding="utf-8") as f:
    f.write(content)

print("Clean android/app/build.gradle written!")
