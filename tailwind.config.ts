import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "'Noto Sans Thai'", "sans-serif"],
        heading: ["var(--font-heading)", "'Kanit'", "sans-serif"],
        kanit: ["'Kanit'", "sans-serif"],
        noto: ["'Noto Sans Thai'", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        border: "var(--border)",
        brand: "var(--brand)",
      },
    },
  },
  plugins: [],
};

export default config;
