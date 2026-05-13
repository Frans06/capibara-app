import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { fetchSession } from "~/auth/server";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await fetchSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
  component: () => <Outlet />,
});
