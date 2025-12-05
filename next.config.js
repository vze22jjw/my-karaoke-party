import { withAxiom } from "next-axiom";
import createNextIntlPlugin from 'next-intl/plugin';
import { createRequire } from "module"; 
import withSerwistInit from "@serwist/next";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

await import("./src/env.js");

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
});

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  
  env: {
    NEXT_PUBLIC_NEXT_VERSION: pkg.dependencies.next,
    NEXT_PUBLIC_PRISMA_VERSION: pkg.dependencies["@prisma/client"],
  },

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

export default withAxiom(withNextIntl(withSerwist(config)));
