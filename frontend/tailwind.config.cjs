/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: { 950: "#0a0b0d", 900: "#111318", 800: "#1a1d24", 700: "#252932" },
        accent: { DEFAULT: "#FF6A00", dim: "#FF6A0026", hover: "#FF7F1F" },
        risk: { approved: "#3DDC97", flagged: "#FFB020", high: "#FF4D4D" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], mono: ["IBM Plex Mono", "monospace"] },
      boxShadow: { glow: "0 0 0 1px #FF6A0033, 0 0 24px 0 #FF6A0022", "glow-sm": "0 0 0 1px #FF6A0033, 0 0 12px 0 #FF6A0022" },
      backdropBlur: { xs: "2px" },
      keyframes: { pulseGlow: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.4 } } },
      animation: { "pulse-glow": "pulseGlow 2s ease-in-out infinite" },
    },
  },
  plugins: [],
};