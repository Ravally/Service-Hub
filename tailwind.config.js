/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Scaffld Primary
        'scaffld-teal': '#0EA5A0',
        'scaffld-teal-deep': '#087F7A',
        'scaffld-teal-light': '#B2F0ED',

        // Scaffld Accents
        'signal-coral': '#F7845E',
        'signal-coral-deep': '#E56840',
        'signal-coral-light': '#FFDCC8',
        'harvest-amber': '#FFAA5C',
        'harvest-amber-deep': '#FF9633',
        'harvest-amber-light': '#FFE8CC',

        // Scaffld Neutrals
        'midnight': '#0C1220',
        'charcoal': '#1A2332',
        'slate-dark': '#2D3B4E',
        'muted': '#6B7F96',
        'silver': '#A3B4C8',
        'cream': '#FFF9F5',
      },
      fontFamily: {
        'sans': ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        'display': ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      boxShadow: {
        'glow-teal': '0 4px 20px rgba(14, 165, 160, 0.3)',
        'glow-coral': '0 4px 20px rgba(247, 132, 94, 0.3)',
        'glow-amber': '0 4px 20px rgba(255, 170, 92, 0.3)',
      },
    },
  },
  plugins: [],
}