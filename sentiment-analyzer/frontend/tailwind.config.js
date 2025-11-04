/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        positive: '#22c55e',
        neutral: '#6b7280',
        negative: '#ef4444'
      }
    }
  },
  plugins: []
};
