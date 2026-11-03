/** Kotha design tokens. Palette: Coolors "Neutral Earth Tones" (0A0908 22333B EAE0D5 C6AC8F 5E503F) + derived state colours. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plaster: '#F3EDE5', bone: '#EAE0D5', sand: '#DFD2C2', line: '#CDBDA8', ink: '#0A0908',
        slate: { DEFAULT: '#22333B', 2: '#2F4651', 3: '#3C5663' }, tan: '#C6AC8F', umber: '#5E503F', ochre: '#7A5A2E',
        paid: '#2F6B4F', due: '#9B3B2A', part: '#8A5A12',
      },
      fontFamily: { sans: ['Archivo', 'Anek Devanagari', 'system-ui', 'sans-serif'], deva: ['Anek Devanagari', 'Archivo', 'sans-serif'] },
      borderRadius: { none: '0', DEFAULT: '0', sm: '2px' },
      maxWidth: { sheet: '1240px' },
      transitionTimingFunction: { draw: 'cubic-bezier(.65,0,.35,1)', out: 'cubic-bezier(.2,.8,.2,1)' },
    },
  },
  plugins: [],
};
