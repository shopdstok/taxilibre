/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../shared/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Add any passenger-web specific customizations here
      // For now, we'll inherit everything from the shared config
    },
  },
  plugins: [],
};