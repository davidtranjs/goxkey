import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isDebug = !!process.env.TAURI_ENV_DEBUG;
const port = Number(process.env.TAURI_DEV_PORT) || 1420;
const host = process.env.TAURI_DEV_HOST || "127.0.0.1";

export default defineConfig(() => ({
  clearScreen: false,
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
    watch: {
      // tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  envPrefix: ["VITE_", "TAURI_ENV_*"],

  preview: {
    port: port + 2,
    host,
  },

  build: {
    target:
      process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
    minify: !isDebug ? "esbuild" as const : false,
    sourcemap: !isDebug,
  },
}));
