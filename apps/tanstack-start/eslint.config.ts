import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@capibara/eslint-config/base";
import { reactConfig } from "@capibara/eslint-config/react";

export default defineConfig(
  {
    ignores: [".nitro/**", ".output/**", ".tanstack/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
);
