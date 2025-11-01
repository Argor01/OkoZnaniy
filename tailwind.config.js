/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-smartcourse-auth',
    'bg-smartcourse-auth-strong',
    'bg-smartcourse-auth-soft',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Momo Trust Display"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-overlay':
          'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
        // Brand gradients
        'smartcourse-auth':
          'linear-gradient(135deg, #6d28d9 0%, #3b82f6 45%, #fb7185 70%, #f97316 100%)',
        'smartcourse-auth-strong':
          'linear-gradient(135deg, #4c1d95 0%, #1e3a8a 35%, #2563eb 55%, #f59e0b 85%, #ea580c 100%)',
        'smartcourse-auth-soft':
          'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(59,130,246,0.85) 50%, rgba(251,113,133,0.8) 75%, rgba(249,115,22,0.85) 100%)',
      },
      boxShadow: {
        auth: '0 20px 50px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};