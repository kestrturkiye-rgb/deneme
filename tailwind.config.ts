import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // KIVANÇ TURUNCU PALETİ (ana renk)
        brand: {
          100: "#feebdc",
          200: "#fbcba5",
          300: "#f9a872",
          400: "rgb(var(--color-brand-light, 245 132 69) / <alpha-value>)",
          500: "rgb(var(--color-brand, 242 101 34) / <alpha-value>)",
          600: "rgb(var(--color-brand-dark, 217 83 26) / <alpha-value>)",
          700: "#b34215",
          800: "#8a3311",
          900: "#5e230c",
        },
        // AMBER PALETİ (gradyan ve vurgu)
        amber: {
          100: "#fdf0d5",
          200: "#fbe0a8",
          300: "#f7cb72",
          400: "#f3b54a",
          500: "#efa320",
          600: "#c98615",
          700: "#a06b12",
          800: "#765010",
          900: "#4d340b",
        },
        // NÖTR RENKLER
        mist: "rgb(var(--color-mist, 247 247 247) / <alpha-value>)",
        "mist-dark": "#e8e8e8",
        paper: "rgb(var(--color-paper, 255 255 255) / <alpha-value>)",
        ink: "rgb(var(--color-ink, 26 26 26) / <alpha-value>)",
        brick: "rgb(var(--color-brick, 58 42 38) / <alpha-value>)",
        muted: "rgb(var(--color-muted, 107 107 107) / <alpha-value>)",
      },
      fontFamily: {
        display: [
          'var(--heading-font, "Barlow Condensed", Impact, sans-serif)',
        ],
        sans: ["var(--body-font, Manrope, system-ui, sans-serif)"],
      },
      maxWidth: {
        container: "var(--container-width, 1440px)",
      },
      backgroundImage: {
        "quality-gradient":
          "linear-gradient(180deg, #efa320 0%, #f26522 55%, #d4481a 100%)",
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      animation: {
        "float-slow": "float-slow 7s ease-in-out infinite",
        "pin-bounce": "pin-bounce 2s ease-in-out infinite",
        "live-pulse": "live-pulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pin-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "live-pulse": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(134, 239, 172, 0.6)",
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 0 8px rgba(134, 239, 172, 0)",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
