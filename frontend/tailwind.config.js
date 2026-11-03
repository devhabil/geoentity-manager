/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1d6ef0', dark: '#1558c4', light: '#e8f0fe' },
        status: { active: '#22a447', inactive: '#8a8f98', maintenance: '#f59e0b' },
        nav: '#0f2340',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
}
