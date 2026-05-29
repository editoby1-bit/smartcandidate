/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#F2D98A',
          pale: 'rgba(201,168,76,0.08)',
        },
        surface: {
          DEFAULT: '#0F0F0F',
          2: '#141414',
          3: '#1A1A1A',
          4: '#202020',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      }
    }
  },
  plugins: []
}
