// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/*
 main.tsx - punto de montaje de React. Muestra errores si no encuentra #root.
*/

const el = document.getElementById("root");
if (!el) {
  console.error("No se encontró el elemento #root en index.html");
} else {
  createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
