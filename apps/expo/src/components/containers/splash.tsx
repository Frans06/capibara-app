import { SplashScreen } from "expo-router";

import { authClient } from "~/utils/auth";

export function SplashScreenController() {
  const { isPending } = authClient.useSession();

  if (!isPending) {
    SplashScreen.hideAsync();
  }

  return null;
}
