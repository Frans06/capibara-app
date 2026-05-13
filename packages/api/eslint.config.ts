import { defineConfig } from "eslint/config";

import { baseConfig } from "@capibara/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
