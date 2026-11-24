import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { startSync } from "./lib/store";
import "./styles/global.css";
import "./styles/counter.css";
import "./styles/setup.css";
import "./styles/home.css";

startSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
