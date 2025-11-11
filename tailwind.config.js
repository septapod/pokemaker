/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // IBM Plex Sans font family
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
      },
      // Custom colors for Pokemon theme
      colors: {
        pokemon: {
          red: '#FF0000',
          blue: '#3B4CCA',
          yellow: '#FFDE00',
          green: '#00FF00',
        },
      },
    },
  },
  plugins: [],
}
