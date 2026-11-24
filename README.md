# Strikketeller

En radteller for strikking som følger oppskriften. Du legger inn delene én gang (legg opp, øk, strikk til mål, fell), og så sier den for hver rad om du skal øke, felle eller bare strikke, og hvor mange masker du skal ha.

Siden er ren HTML, CSS og JavaScript uten byggesteg. Den lagrer alltid på enheten, og hvis Firebase er satt opp og du er logget inn, følger prosjektene Google-kontoen din.

## Filer

| Fil | Innhold |
| --- | --- |
| `index.html` | Siden |
| `style.css` | Utseendet |
| `app.js` | Telleren, oppskriftene, prosjektene og lagringen |
| `firebase-config.js` | Firebase-oppsettet ditt (står som `null` til du limer det inn) |
| `firestore.rules` | Reglene du limer inn i Firestore |
| `manifest.webmanifest`, ikonene | Gjør at siden kan legges på Hjem-skjermen |

## Prøv den lokalt

```bash
cd ~/repositories/knitcounter
python3 -m http.server 8000
```

Åpne <http://localhost:8000>. Siden må kjøres fra en server, den virker ikke hvis du dobbeltklikker på `index.html`.

## 1. Legg den ut på GitHub Pages

GitHub Pages er gratis for offentlige repoer.

```bash
cd ~/repositories/knitcounter
git init -b main
git add .
git commit -m "Strikketeller"
```

Lag et tomt, offentlig repo som heter `knitcounter` på <https://github.com/new> (uten README), og push:

```bash
git remote add origin https://github.com/<brukernavn>/knitcounter.git
git push -u origin main
```

Har du GitHub CLI, gjør denne ene kommandoen begge deler:

```bash
gh repo create knitcounter --public --source=. --push
```

Slå så på Pages i repoet: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, mappe `/ (root)` → Save**.

Etter et minutt eller to ligger siden på `https://<brukernavn>.github.io/knitcounter/`. Nå virker telleren, men lagrer bare på enheten.

## 2. Slå på innlogging og lagring med Firebase

Gratisnivået (Spark) holder til dette. Navnene på menyene i konsollen kan ha endret seg litt.

1. Gå til <https://console.firebase.google.com> og lag et prosjekt. Google Analytics trengs ikke.
2. **Authentication → Sign-in method → Google → Enable.**
3. **Authentication → Settings → Authorized domains → Add domain:** `<brukernavn>.github.io`
4. **Firestore Database → Create database.** Velg en plassering i Europa og start i *production mode*.
5. Åpne fanen **Rules** i Firestore, lim inn innholdet i `firestore.rules` og trykk **Publish**.
6. **Project settings → Your apps → Web (`</>`)**. Registrer en app (Firebase Hosting trengs ikke) og kopier `firebaseConfig`-objektet.
7. Lim objektet inn i `firebase-config.js` i stedet for `null`, og push:

```bash
git add firebase-config.js
git commit -m "Koble til Firebase"
git push
```

Verdiene i `firebaseConfig` er ikke hemmelige og kan ligge i et offentlig repo. Det er reglene i `firestore.rules` som beskytter dataene: hver bruker får bare lese og skrive sitt eget dokument.

Når siden er oppdatert, står det «Logg inn med Google» nederst i Oppsett.

## Slik lagres det

- Alt ligger i `localStorage` på enheten, så telleren virker uten nett.
- Innlogget lagres det samme i Firestore under `users/<bruker-id>`. Den nyeste kopien vinner.
- Første gang du logger inn på en enhet som allerede har prosjekter, slås de sammen med dem på kontoen.
- Når du logger ut, tømmes enheten. Prosjektene ligger fortsatt på kontoen.

## Oppdatere siden

Endre filene, og så:

```bash
git add .
git commit -m "Hva du endret"
git push
```

GitHub Pages legger ut den nye versjonen av seg selv.
