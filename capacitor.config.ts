import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kas.tracker',
  appName: 'KAS Family Tracker',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    // Remove URL to use local bundled web files from 'public' directory
    // url: 'https://kastracker.avillamor.com/tracker', // Use correct production domain
    cleartext: true // Allow HTTP for localhost testing
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
