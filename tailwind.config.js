/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    'opacity-100',
    'opacity-85',
    'opacity-70',
    'opacity-55',
    'opacity-40',
    'opacity-25',
    'opacity-10',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};