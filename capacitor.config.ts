import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kas.tracker',
  appName: 'KAS Family Tracker',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    url: 'https://kas-app.com', // Change this to your production URL
    cleartext: true // Allow HTTP for localhost testing
  },
  plugins: {
    Geolocation: {
      permissions: ['location']
    },
    Camera: {
      permissions: ['camera', 'microphone']
    }
  }
};

export default config;
