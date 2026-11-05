/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F9FC',
        navy: {
          DEFAULT: '#142B4A',
          50: '#F0F4F9',
          100: '#DCE5F2',
          200: '#B9CCE5',
          600: '#1E3F6B',
          700: '#183459',
          800: '#142B4A',
          900: '#0E1F36',
          950: '#091424',
        },
        primary: {
          DEFAULT: '#2563EB',
          50: '#E8F0FF',
          100: '#D6E4FF',
          200: '#B3CCFF',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        brand: {
          50: '#E8F0FF',
          100: '#D6E4FF',
          200: '#B3CCFF',
          300: '#80ACFF',
          400: '#4D8BFF',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#142B4A',
          900: '#0E1F36',
          950: '#091424',
        },
        ink: {
          DEFAULT: '#172033',
          secondary: '#697386',
          muted: '#8C96A8',
        },
        line: {
          DEFAULT: '#E6EAF0',
          strong: '#D1D8E4',
        },
        success: {
          DEFAULT: '#16A36A',
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#16A36A',
          700: '#15803D',
        },
        warning: {
          DEFAULT: '#E6A23C',
          50: '#FFFBEB',
          100: '#FEF3C7',
          600: '#E6A23C',
          700: '#B45309',
        },
        danger: {
          DEFAULT: '#DC4C4C',
          50: '#FEF2F2',
          100: '#FEE2E2',
          600: '#DC4C4C',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(20, 43, 74, 0.04), 0 1px 2px -1px rgba(20, 43, 74, 0.04)',
        elevated: '0 10px 25px -5px rgba(20, 43, 74, 0.08), 0 4px 10px -6px rgba(20, 43, 74, 0.04)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
