import type { FirebaseOptions } from "firebase/app";

/* Firebase-oppsettet for nettsiden (prosjektet «KnitCounter» i Firebase-konsollen).

   Verdiene er ikke hemmelige og kan ligge i et offentlig repo: det er reglene i
   firestore.rules som bestemmer hvem som får lese og skrive.

   Setter du denne til null, lagrer siden bare på enheten. */
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: "AIzaSyDbhzEdBhX5g-V4cDfM0pvU95lBb7hsSuE",
  authDomain: "knitcounter-b9c8a.firebaseapp.com",
  projectId: "knitcounter-b9c8a",
  storageBucket: "knitcounter-b9c8a.firebasestorage.app",
  messagingSenderId: "340530251414",
  appId: "1:340530251414:web:e2f1383636ca885d93a4b7",
};
