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

/* Les oppskrift fra PDF (Firebase AI Logic med Gemini).

   aiReading skrur valget «Les en oppskrift fra PDF» av og på. La den stå på false til
   AI Logic er slått på i Firebase-konsollen, ellers får brukerne bare en feilmelding.

   appCheckSiteKey er reCAPTCHA-nøkkelen App Check bruker for å vise at kallene kommer
   fra denne nettsiden. Den er offentlig. null = App Check er ikke satt opp. */
export const aiReading: boolean = false;
export const appCheckSiteKey: string | null = null;
