import { SplashScreen } from "expo-router";

import { authClient } from "~/utils/auth";

export function SplashScreenController() {
  const { isPending } = authClient.useSession();

  if (!isPending) {
    void SplashScreen.hideAsync();
  }

  return null;
}
