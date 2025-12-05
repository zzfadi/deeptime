/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep geological theme colors
        deep: {
          900: '#0a0a14',
          800: '#12121f',
          700: '#1a1a2e',
          600: '#252540',
          500: '#3d3d5c',
          400: '#52527a',
        },
        // Era-specific accent colors
        era: {
          precambrian: '#4a1942',
          paleozoic: '#2d4a3e',
          mesozoic: '#4a3d2d',
          cenozoic: '#3d4a2d',
          quaternary: '#2d3d4a',
        },
        // Geological layer colors
        layer: {
          surface: '#8b7355',
          sediment: '#a0826d',
          rock: '#6b5b4f',
          bedrock: '#4a4a4a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
