import baseConfig from "@capibara/eslint-config/base";
import reactConfig from "@capibara/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...baseConfig,
  ...reactConfig,
];
