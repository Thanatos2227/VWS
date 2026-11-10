import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vetri.watersolutions',
  appName: 'Vetri Water Solutions',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0284c7',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#ffffff'
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '820277889521-3cojmn8vtjuo53ocp581mtpgssej2cq5.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;

