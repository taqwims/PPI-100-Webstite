/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // Pindai semua komponen di src
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#295a18', // Deep Green
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f0f9ff',
          foreground: '#0f172a',
        },
        accent: {
          DEFAULT: '#fbbf24',
          foreground: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
