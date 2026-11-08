/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vws: {
          navy: '#1B365D',
          navyDark: '#0F2038',
          navyLight: '#2C4D7D',
          superseded: '#E2E8F0',
          accent: '#0284C7',
          success: '#16A34A',
          warning: '#EAB308',
          danger: '#DC2626',
        }
      }
    },
  },
  plugins: [],
}
