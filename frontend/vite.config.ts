import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server port is pinned to 5173 (Vite's own default) because
// order-payment-service's CORS allow-list (FRONTEND_ORIGIN, see
// SecurityConfig.java) defaults to http://localhost:5173. If you change
// this port, update FRONTEND_ORIGIN to match or requests through the
// gateway to /auth, /orders, /payments will be blocked by the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
