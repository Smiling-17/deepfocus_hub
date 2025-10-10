/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          light: "#60a5fa",
          dark: "#1d4ed8"
        },
        accent: {
          DEFAULT: "#f472b6",
          soft: "#fbcfe8",
          dark: "#db2777"
        },
        aurora: {
          cyan: "#22d3ee",
          emerald: "#34d399",
          violet: "#a855f7"
        }
      },
      boxShadow: {
        glow: "0 15px 45px -15px rgba(37, 99, 235, 0.45)",
        "glow-accent": "0 18px 50px -20px rgba(236, 72, 153, 0.45)"
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
};
