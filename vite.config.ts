import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is provided by Node.js in the Tauri CLI context
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  preview: {
    port: 1420,
    strictPort: true
  }
}));
