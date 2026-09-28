// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initLocalDb } from "./api/localStorageDb";

// Inicializa la DB local (seed de productos y usuarios)
initLocalDb();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);