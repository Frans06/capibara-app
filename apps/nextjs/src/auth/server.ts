import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@capibara/auth";

import { env } from "~/env";

const baseUrl = env.APP_URL ?? "http://localhost:3000";

export const auth = initAuth({
  baseUrl,
  productionUrl: env.APP_URL ?? "http://localhost:3000",
  secret: env.AUTH_SECRET,
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
