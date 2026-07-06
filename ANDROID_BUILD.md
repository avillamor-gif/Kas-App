# Android APK Build Instructions

## Prerequisites

Your KAS Tracker app is now configured for Android building using Capacitor. To build the APK, you need to set up the Android development environment.

### 1. Install Java Development Kit (JDK)

**For macOS:**
```bash
# Using Homebrew (recommended)
brew install java
# Or download from: https://www.oracle.com/java/technologies/downloads/
```

**Set JAVA_HOME:**
```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc
source ~/.zshrc
```

### 2. Install Android SDK

**Option A: Using Android Studio (Recommended)**
- Download Android Studio: https://developer.android.com/studio
- Install and open it
- Install SDKs:
  - Go to Settings → SDK Manager
  - Install Android 13 (API level 33) or higher
  - Install Android SDK Tools

**Option B: Using Command Line**
```bash
# Install with Homebrew
brew install android-commandlinetools

# Set environment variables
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
```

### 3. Build the APK

**Run from project directory:**

```bash
# For development (unsigned, debuggable)
cd /Users/leopura/kas-app
npm run build
npx cap sync android
cd android
./gradlew assembleDebug

# APK output: android/app/build/outputs/apk/debug/app-debug.apk
```

**For production (signed release):**
```bash
cd android
./gradlew assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

## Installation on Device/Emulator

### Install Debug APK
```bash
# Connect device or start emulator
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Install Release APK
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Distributing APK to Members

1. **Generate QR code** in admin dashboard for each member
2. **QR points to**: `https://your-domain.com/download/member-[ID].apk`
3. **Member scans** → Downloads and installs APK
4. **App opens** → Shows login screen
5. **Auto-login** via admin's QR or manual credentials

## Configuration

- **App Package ID**: `com.kas.tracker`
- **App Name**: KAS Family Tracker
- **Minimum Android**: API 24 (Android 7.0)
- **Target Android**: API 34 (Android 14)

## API Configuration

Update `capacitor.config.ts` to point to your production server:

```typescript
server: {
  url: 'https://kas-app.com', // Change to your URL
  androidScheme: 'https'
}
```

## Troubleshooting

**Build fails with "JAVA_HOME not set":**
```bash
export JAVA_HOME=$(/usr/libexec/java_home)
```

**Build fails with "Android SDK not found":**
- Ensure Android Studio SDK Manager installed all required SDKs
- Set ANDROID_HOME environment variable

**APK too large:**
- Build variants: `./gradlew assembleDebug --info`
- Enable ProGuard/R8 in `android/app/build.gradle`

## Next Steps

1. Install Android SDK and build tools
2. Run `./gradlew assembleDebug` to generate debug APK
3. Test APK on Android device
4. Create download endpoint for APK distribution
5. Generate member-specific QR codes pointing to download

---

**Questions?** Check Capacitor docs: https://capacitorjs.com/docs/getting-started/environment-setup
