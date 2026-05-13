import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import type { Auth } from "@capibara/auth";
import { initAuth } from "@capibara/auth";

import { env } from "~/env";
import { getBaseUrl } from "~/lib/url";

// `initAuth` reads server-only env vars. Wrapping it in `createIsomorphicFn`
// makes Vite strip the `.server()` branch (and its env access) from the
// client bundle, so importing this file from a client-rendered route is safe.
export const auth = createIsomorphicFn()
  .server(() =>
    initAuth({
      baseUrl: getBaseUrl(),
      productionUrl: `https://${env.VERCEL_PROJECT_PRODUCTION_URL ?? "turbo.t3.gg"}`,
      secret: env.AUTH_SECRET,
      extraPlugins: [tanstackStartCookies()],
    }),
  )
  .client(() => null as unknown as Auth)();

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    return session;
  },
);
