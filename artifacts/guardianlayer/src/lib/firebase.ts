import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured. Set the VITE_FIREBASE_* environment variables.");
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  return signInWithPopup(getFirebaseAuth(), provider);
}

export async function signInWithGitHub(): Promise<UserCredential> {
  const provider = new GithubAuthProvider();
  provider.addScope("user:email");
  return signInWithPopup(getFirebaseAuth(), provider);
}

export async function signInWithFacebook(): Promise<UserCredential> {
  const provider = new FacebookAuthProvider();
  provider.addScope("email");
  provider.addScope("public_profile");
  return signInWithPopup(getFirebaseAuth(), provider);
}

export async function signInWithApple(): Promise<UserCredential> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return signInWithPopup(getFirebaseAuth(), provider);
}

export async function getIdToken(): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth();
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken();
}

export function firebaseSignOut(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  return firebaseAuth.signOut();
}

export { isFirebaseConfigured };
