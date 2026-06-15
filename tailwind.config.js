/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          900: '#0B1D3A',
          800: '#0F2647',
          700: '#143054',
          600: '#1A3D6A',
          500: '#1E4D8A',
        },
        ice: {
          500: '#00D4FF',
          400: '#33DDFF',
          300: '#66E6FF',
          200: '#99EEFF',
          100: '#CCF7FF',
        },
        amber: {
          500: '#FFB020',
          400: '#FFC04D',
          300: '#FFD080',
        },
        coral: {
          500: '#FF4757',
          400: '#FF6B78',
          300: '#FF8F99',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
