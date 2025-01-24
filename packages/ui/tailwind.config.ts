import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
      colors: {
        main: {
          700: "#008DDA",
          600: "#00A9FF",
          500: "#89CFF3",
          400: "#1da1f2",
          300: "#A0E9FF",
          200: "#CDF5FD",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
