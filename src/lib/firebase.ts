/* Firebase bak CloudAdapter-grensesnittet. Lastes først når siden trenger det,
   så forsiden slipper å vente på Firebase-biblioteket. */
import { firebaseConfig } from "../firebase-config";
import type { CloudAdapter } from "./sync";
import type { AppState } from "./types";

export const cloudConfigured = !!firebaseConfig?.apiKey;

export async function loadFirebase(): Promise<CloudAdapter> {
  if (!firebaseConfig) throw new Error("Firebase er ikke satt opp");
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = initializeApp(firebaseConfig);
  const a = auth.getAuth(app);
  const db = fs.getFirestore(app);
  const ref = (uid: string) => fs.doc(db, "users", uid);

  return {
    onUser(cb) {
      auth.onAuthStateChanged(a, (u) => cb(u ? { uid: u.uid, label: u.email || u.displayName || "Google-kontoen din" } : null));
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
