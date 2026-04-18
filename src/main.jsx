// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import App from "./App";
import depotTropicalTheme from "./theme/depotTropicalTheme";
import { UserProvider } from "./context/UserContext";
import { fetchBackendUrl, setBackendUrl } from "./api/axios";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

(async () => {
  // Toujours lire l'URL du backend depuis la table appendpoint
  const url = await fetchBackendUrl();
  setBackendUrl(url);
})();

root.render(
  <React.StrictMode>
    <ThemeProvider theme={depotTropicalTheme}>
      <CssBaseline />
      <UserProvider>
        <App />
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}
