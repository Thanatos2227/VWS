
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  connectAuthEmulator,
  Auth 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  Firestore 
} from 'firebase/firestore';
import { 
  getFunctions, 
  connectFunctionsEmulator, 
  Functions 
} from 'firebase/functions';

const configuredApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isDevOrTest = import.meta.env.DEV || import.meta.env.MODE === 'test' || typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!configuredApiKey && !isDevOrTest) {
  console.warn('[VWS Firebase] WARNING: VITE_FIREBASE_API_KEY is missing from environment. Real Google Identity endpoints will fail without a valid key.');
}

const firebaseConfig = {
  apiKey: configuredApiKey || 'AIzaSyMockKeyForDevPhase02LocalInitOnly',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vws-s-8bef5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vws-s-8bef5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vws-s-8bef5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined
};

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account'
});

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  dbInstance = initializeFirestore(app, {});
}
export const db: Firestore = dbInstance;

export const functions: Functions = getFunctions(app, 'asia-south1');

const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 
  (typeof process !== 'undefined' ? (process.env.VITE_FIREBASE_EMULATOR_HOST || (process.env.FIRESTORE_EMULATOR_HOST ? process.env.FIRESTORE_EMULATOR_HOST.split(':')[0] : undefined)) : undefined);
if (emulatorHost) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
    console.info(`[VWS Firebase] Connected to Local Emulator Suite at ${emulatorHost}`);
  } catch {
  }
}

