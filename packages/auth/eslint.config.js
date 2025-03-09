import baseConfig, { restrictEnvAccess } from "@capibara/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [],
  },
  ...baseConfig,
  ...restrictEnvAccess,
];
