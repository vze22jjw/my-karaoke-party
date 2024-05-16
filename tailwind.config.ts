import { type Config } from "tailwindcss";
import daisyui from "daisyui";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-roboto-slab)"],
        mono: ["var(--font-roboto-mono)"],
      },
    },
  },
  plugins: [typography, daisyui],
  daisyui: {
    themes: ["synthwave"],
  },
} satisfies Config;
