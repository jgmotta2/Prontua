import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS var com suporte a opacidade (bg-cream/50, text-ink/80, etc.)
        cream:      'rgb(var(--color-cream) / <alpha-value>)',
        sage:       {
          DEFAULT: 'rgb(var(--color-sage) / <alpha-value>)',
          dark:    'rgb(var(--color-sage-dark) / <alpha-value>)',
        },
        terracotta: 'rgb(var(--color-terracotta) / <alpha-value>)',
        ink:        'rgb(var(--color-ink) / <alpha-value>)',
        muted:      'rgb(var(--color-muted) / <alpha-value>)',
        warm:       'rgb(var(--color-warm) / <alpha-value>)',
        // Sidebar permanece escuro em ambos os modos
        sidebar:    'rgb(var(--color-sidebar) / <alpha-value>)',
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
