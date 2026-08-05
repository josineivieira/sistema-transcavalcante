export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155'
        }
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px'
      }
    }
  },
  plugins: []
}
