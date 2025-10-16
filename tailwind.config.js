/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./js/*.js"],
  theme: {
    extend: {
      colors: {
        'cyberpunk-neon': '#00ffff',
        'cyberpunk-pink': '#ff00ff',
        'cyberpunk-orange': '#ff6600',
        'dark-bg': '#0f0f1a',
        'dark-secondary': '#1a1a2e',
        'dark-tertiary': '#16213e',
      },
      fontFamily: {
        sans: ['sans-serif'],
      },
    },
  },
  plugins: [],
}
