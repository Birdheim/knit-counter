import { useSyncExternalStore } from "react";
import { store, sync } from "./store";

/** Hele tilstanden. Komponenten tegnes på nytt når noe endrer seg. */
export const useAppState = () => useSyncExternalStore(store.subscribe, store.get);

/** Innloggingsstatus og tekst til «Konto». */
export const useAccount = () => useSyncExternalStore(sync.subscribe, sync.status);
