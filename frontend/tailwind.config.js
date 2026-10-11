/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2ff',
          100: '#e0e7ff',
          700: '#162c48',
          800: '#0f1f33',
          900: '#0a1628',
        },
        civic: {
          blue: '#2563eb',
          teal: '#0d9488',
          amber: '#f59e0b',
          red: '#dc2626',
          green: '#16a34a',
        },
      },
    },
  },
  plugins: [],
};
