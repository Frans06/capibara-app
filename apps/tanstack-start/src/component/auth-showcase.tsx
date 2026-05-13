import { useNavigate } from "@tanstack/react-router";

import { Button } from "@capibara/ui/button";

import { authClient } from "~/auth/client";

export function AuthShowcase() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {session ? (
        <p className="text-center text-2xl">
          <span>Logged in as {session.user.name}</span>
        </p>
      ) : (
        <p className="text-center text-2xl">
          <span>Not logged in</span>
        </p>
      )}
      {session && (
        <Button
          size="lg"
          onClick={async () => {
            await authClient.signOut();
            await navigate({ href: "/", replace: true });
          }}
        >
          Sign out
        </Button>
      )}
    </div>
  );
}
