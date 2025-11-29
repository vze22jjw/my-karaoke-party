import { withAxiom } from "next-axiom"
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

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

export default withAxiom(config);
