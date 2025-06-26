import { Redirect, Stack } from "expo-router";

import { authClient } from "~/utils/auth";

export default function StackLayout() {
  const { data: session } = authClient.useSession();
  if (!session) {
    return <Redirect href="/login" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
