/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          // Semantic light-mode palette. Names kept for backwards compat:
          // "black" = canvas bg (lightest), "white" = ink (darkest text).
          black: "#f8fafc",   // canvas — main page bg (slate-50)
          white: "#0f172a",   // ink — primary text (slate-900)
          accent: "#16a34a",  // green-600 — stronger on light bg
          muted: "#64748b",   // slate-500 — secondary text
          dark: "#e2e8f0",    // slate-200 — deeper subtle bg
          surface: "#ffffff", // cards bg — pure white
          border: "#e2e8f0",  // slate-200 — subtle, visible border
        },
      },
      fontFamily: {
        sora: ['"Sora"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "ui-monospace", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "marquee": "marquee 30s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
