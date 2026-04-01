import { Redirect, Stack } from "expo-router";

import { authClient } from "~/utils/auth";

export default function AppLayout() {
  const { data: session } = authClient.useSession();
  if (!session) {
    return <Redirect href="/login" />;
  }
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="post/[id]"
        options={{ headerShown: true, title: "Post" }}
      />
      <Stack.Screen
        name="receipts/[id]"
        options={{ headerShown: true, title: "Receipt" }}
      />
    </Stack>
  );
}
