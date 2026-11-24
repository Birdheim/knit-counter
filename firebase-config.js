// Firebase-oppsettet for nettsiden.
//
// Lim inn objektet du får i Firebase-konsollen (Project settings → Your apps → Web app)
// i stedet for null. Disse verdiene er ikke hemmelige og kan ligge i et offentlig repo:
// det er reglene i firestore.rules som bestemmer hvem som får lese og skrive.
//
// Så lenge det står null, virker telleren som før og lagrer bare på enheten.
//
// export const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "ditt-prosjekt.firebaseapp.com",
//   projectId: "ditt-prosjekt",
//   storageBucket: "...",
//   messagingSenderId: "...",
//   appId: "..."
// };

export const firebaseConfig = null;
