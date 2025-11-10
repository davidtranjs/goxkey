import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0891b2",
          dark: "#0e7490",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
