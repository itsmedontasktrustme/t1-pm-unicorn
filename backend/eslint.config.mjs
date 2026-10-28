import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["src/**/*.js", "test/**/*.js", "healthcheck.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
      sourceType: "commonjs",
    },
  },
]);
