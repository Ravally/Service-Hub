/** @type {import('tailwindcss').Config} */

// ============================================
// SCAFFLD — Tailwind CSS Theme Extension
// brand/tailwind.config.js
//
// Usage: Merge into your project's tailwind.config.js
//   const scaffldTheme = require('./brand/tailwind.config.js');
//   module.exports = { ...scaffldTheme, content: [...] };
//
// Or spread into your existing theme:
//   theme: { extend: { ...scaffldTheme.theme.extend } }
// ============================================

module.exports = {
  theme: {
    extend: {
      colors: {
        scaffld: {
          DEFAULT: '#0EA5A0',
          deep: '#087F7A',
          light: '#B2F0ED',
        },
        coral: {
          DEFAULT: '#F7845E',
          deep: '#E56840',
          light: '#FFDCC8',
        },
        amber: {
          DEFAULT: '#FFAA5C',
          deep: '#FF9633',
          light: '#FFE8CC',
        },
        midnight: '#0C1220',
        charcoal: '#1A2332',
        slate: '#2D3B4E',
        muted: '#6B7F96',
        silver: '#A3B4C8',
        cream: '#FFF9F5',
      },
      fontFamily: {
        primary: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        editorial: ['"Playfair Display"', 'Georgia', 'serif'],
        data: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '0.95', letterSpacing: '-0.04em', fontWeight: '700' }],
        'h1': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '700' }],
        'h2': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h4': ['1.15rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.7', fontWeight: '300' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.05em' }],
        'label': ['0.65rem', { lineHeight: '1.2', letterSpacing: '0.2em', fontWeight: '500' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '20px',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.15)',
        'md': '0 4px 20px rgba(0, 0, 0, 0.2)',
        'lg': '0 8px 40px rgba(0, 0, 0, 0.25)',
        'glow-teal': '0 4px 20px rgba(14, 165, 160, 0.3)',
        'glow-coral': '0 4px 20px rgba(247, 132, 94, 0.3)',
        'glow-amber': '0 4px 20px rgba(255, 170, 92, 0.3)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-up': 'fade-up 0.8s ease-out forwards',
        'gradient-flow': 'gradient-flow 8s ease infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(0.8)' },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'gradient-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
};
