import type { FirebaseOptions } from "firebase/app";

/* Firebase-oppsettet for nettsiden.

   Lim inn objektet du får i Firebase-konsollen (Project settings → Your apps → Web app)
   i stedet for null. Verdiene er ikke hemmelige og kan ligge i et offentlig repo:
   det er reglene i firestore.rules som bestemmer hvem som får lese og skrive.

   Så lenge det står null, lagrer siden bare på enheten.

   export const firebaseConfig: FirebaseOptions | null = {
     apiKey: "...",
     authDomain: "ditt-prosjekt.firebaseapp.com",
     projectId: "ditt-prosjekt",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
*/
export const firebaseConfig: FirebaseOptions | null = null;
