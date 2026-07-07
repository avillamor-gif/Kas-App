import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kas.tracker',
  appName: 'KAS Family Tracker',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    url: 'https://kastracker.avillamor.com/tracker', // Production domain
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000
    },
    Geolocation: {
      permissions: ['location']
    },
    Camera: {
      permissions: ['camera', 'microphone']
    }
  },
  // Hide browser UI in Android WebView
  platformSpecificOptions: {
    android: {
      fullScreen: true
    }
  }
};

export default config;
