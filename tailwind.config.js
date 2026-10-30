/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F6F7F4',
          subtle: '#EEF0EB',
          sheet: '#FFFFFF',
          border: '#DDE2DC',
          darkBorder: '#B9C2B8',
        },
        ink: {
          900: '#141E1C',
          800: '#233230',
          700: '#384845',
          600: '#526461',
          500: '#556865', // Adjusted for WCAG AA 4.5:1 contrast on paper (#F6F7F4)
          400: '#778A87', // High contrast for dark background pills & borders
        },
        seal: {
          dark: '#08332C',
          DEFAULT: '#0F4C42',
          light: '#1B6A5D',
          tint: '#E7F2EE',
          glow: '#C1DFD7',
        },
        ochre: {
          dark: '#874307',
          DEFAULT: '#C06815',
          light: '#DE852C',
          tint: '#FDF4E7',
          border: '#F5D7B0',
        },
        brick: {
          dark: '#781919',
          DEFAULT: '#A62626',
          light: '#C73838',
          tint: '#FCEBEB',
          border: '#F5BEBE',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        stamp: '0 2px 0 0 rgba(15, 76, 66, 0.2), inset 0 0 0 1px rgba(15, 76, 66, 0.25)',
        sheet: '0 1px 3px 0 rgba(20, 30, 28, 0.06), 0 1px 2px -1px rgba(20, 30, 28, 0.04)',
        paperRaised: '0 4px 12px -2px rgba(20, 30, 28, 0.08), 0 2px 4px -2px rgba(20, 30, 28, 0.04)',
      },
    },
  },
  plugins: [],
}
