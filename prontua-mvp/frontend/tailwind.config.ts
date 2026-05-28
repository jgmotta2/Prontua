import type { Config } from 'tailwindcss';

/**
 * Design tokens do Sereno (espelham as CSS vars do protótipo).
 * Paleta verde-sálvia + terracota sobre creme.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:    '#F5F1E8',
        sage:     { DEFAULT: '#6B8E7F', dark: '#4A6B5E' },
        terracotta:'#C97B5C',
        ink:      '#2D3B36',
        muted:    '#7A8B85',
        warm:     '#E8DDC8',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        soft: '0 4px 14px -2px rgba(45, 59, 54, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
