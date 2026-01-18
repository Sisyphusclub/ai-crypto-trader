/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CEX Trading Platform Color System
        primary: {
          DEFAULT: '#F59E0B',
          50: '#FEF7E6',
          100: '#FDECC3',
          200: '#FBE19F',
          300: '#F9D67B',
          400: '#F7CB57',
          500: '#F59E0B',
          600: '#D4860A',
          700: '#B36E08',
          800: '#925607',
          900: '#713E05',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        surface: {
          DEFAULT: '#0F172A',
          50: '#1E293B',
          100: '#1A2332',
          200: '#151D2C',
          300: '#111827',
          400: '#0D1421',
          500: '#0F172A',
          600: '#0B1120',
          700: '#080D18',
          800: '#050910',
          900: '#020408',
        },
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        sans: ['Poppins', 'Exo 2', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-accent': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.3)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'price-up': 'priceUp 0.3s ease-out',
        'price-down': 'priceDown 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' },
        },
        priceUp: {
          '0%': { backgroundColor: 'rgba(34, 197, 94, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        priceDown: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}
