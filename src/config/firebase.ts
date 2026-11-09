/**
 * src/config/firebase.ts
 * 
 * Firebase Client SDK Initialization & Offline Persistence Configuration.
 * Conforms to DOC-006 (Security Architecture) and DOC-004 (System Architecture).
 * Supports both production Firebase and local Firebase Emulator Suite.
 */

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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyMockKeyForDevPhase02LocalInitOnly',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vetri-water-solutions.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vetri-water-solutions',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vetri-water-solutions.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:mockappid000000000000'
};

// Singleton App Instance
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Authentication Instance & Google Provider
export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account'
});

// Firestore with offline IndexedDB multi-tab cache
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  // Fallback if already initialized in test runner
  dbInstance = initializeFirestore(app, {});
}
export const db: Firestore = dbInstance;

// Functions Instance (Region asia-south1 per DOC-004)
export const functions: Functions = getFunctions(app, 'asia-south1');

// Optional Emulator Hooks for local integration testing (DOC-006 §7 / VER-10)
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST;
if (emulatorHost && !import.meta.env.PROD) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
    console.info(`[VWS Firebase] Connected to Local Emulator Suite at ${emulatorHost}`);
  } catch {
    // Emulator already connected
  }
}

