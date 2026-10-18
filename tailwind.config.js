export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#0b1426', 800: '#12203a', 700: '#1b2c4d', 600: '#2a3f66' },
        gold: { 400: '#f6b83a', 500: '#f2a71b' },
        cream: '#f5efe3',
        mist: '#8fa0bd'
      },
      fontFamily: {display: ['"DM Serif Display"', 'serif'], sans: ['"DM Sans"', 'sans-serif'], mono: ['"IBM Plex Mono"', 'monospace']}
    }
  },
  plugins: []
}