import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
    },
  },
  globalIgnores(["node_modules/**", "coverage/**"]),
]);
