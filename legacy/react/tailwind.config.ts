// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.css"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#1D4ED8',
          dark: '#3B82F6', 
        },
        background: {
          light: '#FFFFFF',
          dark: '#1F2937',
        },
        text: {
          light: '#000000',
          dark: '#FFFFFF',
        },
        accent: {
          light: '#6366F1',
          dark: '#8B5CF6',
        }
      },
      textColor: {
        skin: {
          base: 'var(--color-text)',
          primary: 'var(--color-primary)',
          accent: 'var(--color-accent)',
        },
      },
      backgroundColor: {
        skin: {
          fill: 'var(--color-background)',
          primary: 'var(--color-primary)',
          accent: 'var(--color-accent)',
        },
      },
      borderColor: {
        skin: {
          base: 'var(--color-border)',
          primary: 'var(--color-primary)',
          accent: 'var(--color-accent)',
        },
      },
    },
  },
};