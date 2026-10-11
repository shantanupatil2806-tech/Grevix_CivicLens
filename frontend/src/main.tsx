import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker in production or when explicitly enabled in development (VITE_ENABLE_SW=true)
const enableSw = import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === 'true';
if (enableSw && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.error('CivicLens offline app shell registration failed:', error);
  });
}
