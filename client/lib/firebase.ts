import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export type FirebaseResources = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let cached: FirebaseResources | null = null;

export function getFirebase(): FirebaseResources | null {
  try {
    if (cached) return cached;

    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    } as const;

    // Require at least apiKey and projectId to consider configured
    if (!config.apiKey || !config.projectId) return null;

    const app = getApps().length ? getApps()[0]! : initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);

    cached = { app, auth, db };
    return cached;
  } catch (e) {
    console.warn("Firebase not initialized:", e);
    return null;
  }
}

export function subscribeAuth(cb: (user: import("firebase/auth").User | null) => void) {
  const fb = getFirebase();
  if (!fb) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(fb.auth, cb);
}
