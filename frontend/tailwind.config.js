module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          500: '#ec4899',
          600: '#db2777',
        },
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
        },
      },
    },
  },
  plugins: [],
}
