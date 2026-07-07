import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kas.tracker',
  appName: 'KAS Family Tracker',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://kastracker.avillamor.com/tracker', // Production domain
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true
    },
    Geolocation: {
      permissions: ['location']
    },
    ScreenBrightness: {},
    Screen: {
      screenOrientationLock: 'portrait'
    },
    App: {
      exitOnBackButton: false
    }
  },
  // Hide browser UI in Android WebView
  platformSpecificOptions: {
    android: {
      fullScreen: true,
      allowMixedContent: true,
      webContentsDebuggingEnabled: false
    }
  }
};

export default config;
