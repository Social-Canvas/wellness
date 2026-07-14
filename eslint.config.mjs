import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node-runner test files use `.ts` import extensions for the native TS
    // runner and are not part of the app build/type-check.
    "**/*.test.ts",
    "**/*.test.tsx",
  ]),
]);

export default eslintConfig;
