import baseConfig, { restrictEnvAccess } from "@capibara/eslint-config/base";
import nextjsConfig from "@capibara/eslint-config/nextjs";
import reactConfig from "@capibara/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
