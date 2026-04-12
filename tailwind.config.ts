import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        gold: "var(--gold)",
        "gold-dim": "var(--gold-dim)",
        "gold-soft": "var(--gold-soft)",
        text1: "var(--text)",
        text2: "var(--text2)",
        text3: "var(--text3)",
        border: "var(--border)",
        "color-red": "var(--color-red)",
        "color-green": "var(--color-green)",
        "color-blue": "var(--color-blue)",
        "color-purple": "var(--color-purple)",
        "color-teal": "var(--color-teal)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
    },
  },
  plugins: [],
};
export default config;
