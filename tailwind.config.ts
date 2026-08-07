import type { Config } from "tailwindcss";

/**
 * Design tokens carried over from the prototypes (Handoff §5).
 * Do NOT swap these for generic Tailwind slate/blue — the palette IS the
 * product's visual identity.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#202A26",
        "ink-soft": "#4B5850",
        paper: "#EAE3D3",
        "paper-raised": "#F1ECDE",
        cardinal: "#9C2B2F",
        brass: "#AD8A4E",
        thread: "#8C9A8F",
      },
      fontFamily: {
        // Bound to CSS variables set by next/font in src/app/layout.tsx
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
