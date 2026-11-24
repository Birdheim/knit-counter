# Rett & Vrang

Du strikker, jeg teller.

En radteller for strikking som følger oppskriften. Du legger inn delene én gang (legg opp, øk, strikk til mål, fell), og så sier den for hver rad om du skal øke, felle eller bare strikke, og hvor mange masker du skal ha.

Bygget med React, TypeScript og Vite. Siden lagrer alltid på enheten, og hvis Firebase er satt opp og du er logget inn, følger prosjektene Google-kontoen din.

## Kom i gang

```bash
npm install
npm run dev
```

Åpne adressen som står i terminalen. Siden oppdaterer seg selv når du lagrer en fil.

| Kommando | Hva den gjør |
| --- | --- |
| `npm run dev` | Starter siden lokalt |
| `npm test` | Kjører testene |
| `npm run build` | Typesjekker og bygger siden til `dist/` |
| `npm run preview` | Viser den bygde siden lokalt |
| `npm run lint` | Ser etter vanlige feil |

## Hvor ting ligger

```
src/
  main.tsx              starter appen
  App.tsx               sidene og adressene deres
  firebase-config.ts    Firebase-oppsettet ditt (null til du limer det inn)
  pages/
    Home.tsx            forsiden
    Projects.tsx        Mine prosjekter, oppskriftsbanken og innlogging
    Counter.tsx         telleren for ett prosjekt
  components/
    Scene.tsx           tegningen på forsiden, med blikket som følger pekeren
    KnitDrawing.tsx     pinnene og arbeidet som vokser
    NowCard.tsx         kortet som sier hva du gjør på denne raden
    SetupSheet.tsx      oppsettet: navn, oppskrift, garnfarge, start på nytt, slett
    HoldButton.tsx      knapp som må holdes inne
    NumberField.tsx     tallfelt
  lib/
    types.ts            formen på dataene
    pattern.ts          regnestykkene for oppskriften (testet i pattern.test.ts)
    clean.ts            standardverdier og opprydding av lagrede data
    store.ts            tilstanden og alle endringer av den
    sync.ts             synk mot kontoen (testet i sync.test.ts)
    firebase.ts         Firebase bak synken
    rowInfo.tsx         teksten om raden du strikker nå
  styles/
    global.css          fargene og avstandene som variabler øverst
    home.css            forsiden og tegningen
    counter.css         tellesiden
    setup.css           oppsettet og listene
public/                 ikoner og manifest
```

Vanlige endringer:

- **Farger:** variablene øverst i `src/styles/global.css`.
- **Garnfarger:** `src/lib/yarns.ts`.
- **Ny side:** lag en fil i `src/pages/` og legg til en `<Route>` i `src/App.tsx`.
- **Tegningen på forsiden:** `src/components/Scene.tsx` (formene) og nederst i `src/styles/home.css` (bevegelsene).
- **Ferdige oppskrifter i banken:** `BUILTIN` i `src/lib/clean.ts`.

Adressene ser slik ut: `/#/`, `/#/prosjekter` og `/#/prosjekt/<id>`. Tegnet `#` er der fordi GitHub Pages bare leverer filer, og da virker adressene uten ekstra oppsett.

## Legg den ut på GitHub Pages

Siden må bygges før den kan vises, så GitHub gjør det for deg med arbeidsflyten i `.github/workflows/deploy.yml`.

1. I repoet på GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Første gang: flytt arbeidsflyten på plass. Den ligger som `deploy-workflow.yml` i rota fordi den måtte legges inn for hånd.

```bash
mkdir -p .github/workflows
mv deploy-workflow.yml .github/workflows/deploy.yml
```

3. Push til `main`:

```bash
git add -A
git commit -m "React og TypeScript"
git push
```

Under **Actions** ser du at den tester, bygger og legger ut. Etter et par minutter ligger siden på `https://<brukernavn>.github.io/<repo>/`.

## Slå på innlogging og lagring med Firebase

Gratisnivået (Spark) holder til dette. Navnene på menyene i konsollen kan ha endret seg litt.

1. Gå til <https://console.firebase.google.com> og lag et prosjekt. Google Analytics trengs ikke.
2. **Authentication → Sign-in method → Google → Enable.**
3. **Authentication → Settings → Authorized domains → Add domain:** `<brukernavn>.github.io`
4. **Firestore Database → Create database.** Velg en plassering i Europa og start i *production mode*.
5. Åpne fanen **Rules** i Firestore, lim inn innholdet i `firestore.rules` og trykk **Publish**.
6. **Project settings → Your apps → Web (`</>`)**. Registrer en app (Firebase Hosting trengs ikke) og kopier `firebaseConfig`-objektet.
7. Lim objektet inn i `src/firebase-config.ts` i stedet for `null`, og push.

Verdiene i `firebaseConfig` er ikke hemmelige og kan ligge i et offentlig repo. Det er reglene i `firestore.rules` som beskytter dataene: hver bruker får bare lese og skrive sitt eget dokument.

Når siden er oppdatert, står det «Logg inn med Google» nederst på «Mine prosjekter».

## Slik lagres det

- Alt ligger i `localStorage` på enheten, så telleren virker uten nett.
- Innlogget lagres det samme i Firestore under `users/<bruker-id>`. Den nyeste kopien vinner.
- Første gang du logger inn på en enhet som allerede har prosjekter, slås de sammen med dem på kontoen.
- Når du logger ut, tømmes enheten. Prosjektene ligger fortsatt på kontoen.

## Om `npm audit`

`npm audit` melder om sårbarheter i `@grpc/grpc-js`, som følger med Firebase. Den pakken brukes bare når Firestore kjører i Node, og er ikke med i det som bygges for nettleseren. Ikke kjør `npm audit fix --force`: det bytter til en gammel Firebase-versjon.
