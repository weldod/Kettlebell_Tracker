/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./assets/js/*.js"],
  theme: {
    extend: {
      colors: {
        fluo: '#CCFF00',
        work: '#22c55e', // vert action
        rest: '#ef4444', // rouge
        bgDark: '#000000',
      },
      fontFamily: {
        timer: ['Impact', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
