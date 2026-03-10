import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './testFetchEvents';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// ✅ Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.log("✅ Service Worker registered:", reg))
      .catch((err) => console.error("❌ Service Worker registration failed:", err));
  });
}

// Register the service worker (only in production builds)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW registration failed:", err));
  });
}

// --- Push Notification Setup ---
async function registerPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications not supported in this browser.");
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  // Ask for permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("Notification permission denied.");
    return;
  }

  // Subscribe user (temporary public key — will replace later with real VAPID key)
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: "<YOUR_VAPID_PUBLIC_KEY_BASE64>",
  });

  console.log("Push subscription created:", sub);

  // TODO: send `sub` to your Supabase backend for storage
}

window.addEventListener("load", () => {
  registerPushNotifications().catch(console.error);
});
