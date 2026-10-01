/** Colors come from CSS variables so light/dark switch automatically (see index.css). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', mute: 'var(--mute)',
        accent: 'var(--accent)', good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)',
      },
      fontFamily: { sans: ['Nunito', 'system-ui', 'sans-serif'] },
    },
  },
}
