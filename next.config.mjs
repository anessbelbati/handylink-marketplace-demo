import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import("next").NextConfig} */
const nextConfig = (() => {
  /** @type {import("next").NextConfig["images"]["remotePatterns"]} */
  const remotePatterns = [
    { protocol: "https", hostname: "images.unsplash.com" },
    { protocol: "https", hostname: "plus.unsplash.com" },
    { protocol: "https", hostname: "img.clerk.com" },
  ];

  const addRemote = (maybeUrl) => {
    try {
      if (!maybeUrl) return;
      const u = new URL(maybeUrl);
      remotePatterns.push({
        protocol: u.protocol.replace(":", ""),
        hostname: u.hostname,
      });
    } catch {
      // Ignore invalid env var; Next will still build, and images can fall back to <img>.
    }
  };

  // Convex storage URLs can come from either convex.cloud or convex.site.
  addRemote(process.env.NEXT_PUBLIC_CONVEX_URL);
  addRemote(process.env.CONVEX_URL);
  addRemote(process.env.CONVEX_SITE_URL);

  return {
    images: {
      remotePatterns,
    },
    // Avoid Next inferring an incorrect workspace root when other lockfiles exist.
    outputFileTracingRoot: __dirname,
    turbopack: {
      root: __dirname,
    },
  };
})();

export default nextConfig;
