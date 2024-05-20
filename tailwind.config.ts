import { type Config } from "tailwindcss";
import daisyui from "daisyui";
import typography from "@tailwindcss/typography";
import tailwindAnimate from "tailwindcss-animate";
import vidstackTailwind from "@vidstack/react/tailwind.cjs";

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
  plugins: [typography, daisyui, vidstackTailwind, tailwindAnimate],
  daisyui: {
    themes: ["synthwave"],
  },
} satisfies Config;
