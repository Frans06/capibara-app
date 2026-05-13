import { defineConfig } from "eslint/config";

import { baseConfig } from "@capibara/eslint-config/base";
import { reactConfig } from "@capibara/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
