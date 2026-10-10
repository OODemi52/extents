import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app-next/app.tsx";
import { Provider } from "./provider.tsx";

import { api } from "@/services/api";
import "@/styles/globals.css";

const themeKey = "heroui-theme";

try {
  localStorage.setItem(themeKey, "dark");
} catch {
  // Ignore storage failures; theme class still applies.
}

document.documentElement.classList.remove("light");
document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>,
);

api.renderer.initRenderer().catch((err) => {
  console.error("[main.tsx] Failed to init renderer:", err);
});
