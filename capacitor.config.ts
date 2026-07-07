import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kas.tracker',
  appName: 'KAS Family Tracker',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    url: 'http://10.0.1.31:3000/tracker', // Local dev server for testing (network accessible)
    cleartext: true
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
