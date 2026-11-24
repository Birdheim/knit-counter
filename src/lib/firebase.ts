/* Firebase bak CloudAdapter-grensesnittet. Lastes først når siden trenger det,
   så forsiden slipper å vente på Firebase-biblioteket. */
import { aiReading, firebaseConfig } from "../firebase-config";
import { firebaseApp } from "./firebaseApp";
import type { CloudAdapter } from "./sync";
import type { AppState } from "./types";

export const cloudConfigured = !!firebaseConfig?.apiKey;
/** «Les en oppskrift fra PDF» er skrudd på */
export const canReadPdf = cloudConfigured && aiReading;

export async function loadFirebase(): Promise<CloudAdapter> {
  const [app, auth, fs] = await Promise.all([firebaseApp(), import("firebase/auth"), import("firebase/firestore")]);
  const a = auth.getAuth(app);
  const db = fs.getFirestore(app);
  const ref = (uid: string) => fs.doc(db, "users", uid);

  return {
    onUser(cb) {
      auth.onAuthStateChanged(a, (u) => cb(u ? { uid: u.uid, name: u.displayName ?? "", email: u.email ?? "" } : null));
    },
    /* popup, ikke redirect: redirect virker ikke stabilt når siden ligger på et annet domene enn Firebase */
    async signIn() {
      await auth.signInWithPopup(a, new auth.GoogleAuthProvider());
    },
    signOut: () => auth.signOut(a),
    async load(uid) {
      const snap = await fs.getDoc(ref(uid));
      return snap.exists() ? snap.data() : undefined;
    },
    save: (uid, data: AppState) => fs.setDoc(ref(uid), JSON.parse(JSON.stringify(data))),
  };
}
