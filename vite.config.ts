import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const port = Number(process.env.TAURI_DEV_PORT) || 1420;
const host = process.env.TAURI_DEV_HOST || "127.0.0.1";

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port,
    host,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host,
      port: port + 1,
    },
  },
  preview: {
    port: port + 2,
    host,
  },
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome124" : "safari17",
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
