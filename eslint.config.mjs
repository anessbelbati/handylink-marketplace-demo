import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "convex/_generated/**",
    ],
  },
];

export default config;
