import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { initAuth } from "@capibara/auth";

import { env } from "~/env";
import { getBaseUrl } from "~/lib/url";

export const auth = initAuth({
  baseUrl: getBaseUrl(),
  productionUrl: `https://${env.VERCEL_PROJECT_PRODUCTION_URL ?? "turbo.t3.gg"}`,
  secret: env.AUTH_SECRET,
  extraPlugins: [tanstackStartCookies()],
});

export const fetchSession = createServerFn().handler(() => {
  const headers = new Headers(getRequestHeaders());
  return auth.api.getSession({ headers });
});
