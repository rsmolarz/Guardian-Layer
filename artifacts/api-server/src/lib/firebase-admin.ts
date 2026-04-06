import admin from "firebase-admin";

let initialized = false;

function getFirebaseAdmin(): admin.app.App {
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else if (projectId) {
      admin.initializeApp({ projectId });
    } else {
      admin.initializeApp();
    }
    initialized = true;
  }
  return admin.app();
}

export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  getFirebaseAdmin();
  return admin.auth().verifyIdToken(idToken);
}

export function isFirebaseConfigured(): boolean {
  return !!(process.env.FIREBASE_PROJECT_ID);
}
