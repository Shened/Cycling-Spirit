import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Bebas Neue'", "cursive"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        brand: {
          50:  "#e8f5fb",
          100: "#c5e6f5",
          200: "#9dd4ed",
          300: "#6bbfe3",
          400: "#3AADD4",
          500: "#2B8FBF",
          600: "#2274A0",
          700: "#1A5A80",
          800: "#124060",
          900: "#0A2840",
        },
        accent: {
          50:  "#fde8f2",
          100: "#f9c0de",
          200: "#f490c3",
          300: "#ee60a8",
          400: "#ed3290",
          500: "#E8177A",
          600: "#c4126a",
          700: "#9e0d56",
          800: "#780942",
          900: "#52062e",
        },
        dark: {
          950: "#07090C",
          900: "#0D1117",
          800: "#141B24",
          700: "#1C2533",
          600: "#243040",
          500: "#3a4a5c",
        },
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease forwards",
        "fade-in":    "fadeIn 0.4s ease forwards",
        "slide-right":"slideRight 0.4s ease forwards",
      },
      keyframes: {
        fadeUp:     { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn:     { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideRight: { "0%": { opacity: "0", transform: "translateX(-16px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
