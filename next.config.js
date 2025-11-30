import { withAxiom } from "next-axiom";
import createNextIntlPlugin from 'next-intl/plugin';

await import("./src/env.js");

// FIX: Explicitly point to the i18n file location
const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",

  images: {
    remotePatterns: [
      {
        hostname: "i.ytimg.com"
      },
      {
        hostname: "i.scdn.co" 
      }
    ]
  }
};

export default withAxiom(withNextIntl(config));
