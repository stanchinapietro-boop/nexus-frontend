/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--nexus-ink) / <alpha-value>)",
        panel: "rgb(var(--nexus-panel) / <alpha-value>)",
        raised: "rgb(var(--nexus-raised) / <alpha-value>)",
        line: "rgb(var(--nexus-line) / <alpha-value>)",
        mute: "rgb(var(--nexus-mute) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
