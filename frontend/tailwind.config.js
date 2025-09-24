/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
        gray: {
          50: '#f9fafb',
          600: '#4b5563',
          900: '#111827',
        }
      },
      fontSize: {
        'title': ['24px', '32px'],
        'section': ['18px', '24px'],
        'body': ['15px', '24px'],
        'caption': ['13px', '18px'],
      }
    },
  },
  plugins: [],
}