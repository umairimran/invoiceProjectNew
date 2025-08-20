module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000', // Black: C=0 M=0 Y=0 K=100
        secondary: '#C21A2C', // Red: C=15 M=100 Y=90 K=10
      },
      fontFamily: {
        helvetica: ['Helvetica', 'sans-serif'],
        helveticaBold: ['Helvetica Bold', 'sans-serif'],
        helveticaBlack: ['Helvetica Black', 'sans-serif'],
        signika: ['Signika', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};
