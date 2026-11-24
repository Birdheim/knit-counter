import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /* relative adresser, så siden virker uansett hva repoet heter på GitHub Pages */
  base: "./",
  /* Firebase er stort, men lastes bare når innlogging er satt opp */
  build: { chunkSizeWarningLimit: 700 },
});
