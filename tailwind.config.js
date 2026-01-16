/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'state-blue': '#1e3a8a',
        'state-gray': '#f3f4f6',
        'socure-orange': '#F26522',
      }
    },
  },
  plugins: [],
}
