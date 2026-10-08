/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  corePlugins: {
    // Existing pages rely on default UA styles (headings, buttons, inputs).
    // Disabling preflight keeps Tailwind alongside current CSS without
    // changing desktop appearance outside the migrated auth pages.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        bg: '#0D0F1A',
        panel: '#151829',
        panel2: '#1B1F35',
        line: '#272C47',
        ink: '#EDEEF5',
        sub: '#868CA8',
        faint: '#565C7D',
        profit: '#38D9A9',
        loss: '#FF6B6B',
        gold: '#E8B454',
      },
      borderRadius: {
        card: '14px',
        input: '10px',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
