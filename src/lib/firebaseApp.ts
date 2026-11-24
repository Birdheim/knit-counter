/* Én felles Firebase-app for innlogging, lagring og AI-lesing.
   Lastes først når noe trenger den. */
import type { FirebaseApp } from "firebase/app";
import { appCheckSiteKey, firebaseConfig } from "../firebase-config";

let app: Promise<FirebaseApp> | null = null;

export function firebaseApp(): Promise<FirebaseApp> {
  app ??= (async () => {
    if (!firebaseConfig) throw new Error("Firebase er ikke satt opp");
    const { initializeApp } = await import("firebase/app");
    const created = initializeApp(firebaseConfig);
    /* App Check viser Firebase at kallene kommer fra denne nettsiden. Må startes før alt annet. */
    if (appCheckSiteKey) {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
      initializeAppCheck(created, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    }
    return created;
  })();
  return app;
}
