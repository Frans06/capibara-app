import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type {
  Theme} from "@react-navigation/native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { queryClient } from "~/utils/api";

import "../global.css";

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { SplashScreenController } from "~/components/containers/splash";
import { authClient } from "~/utils/auth";
import { NAV_THEME, useColorScheme } from "~/utils/tailwind";

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// This is the main layout of the app
// It wraps your pages with the providers they need

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();
  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <QueryClientProvider client={queryClient}>
        {/*
          The Stack component displays the current page.
          It also allows you to configure your screens 
        */}

        <SplashScreenController />
        <RootNavigator />
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { data: session } = authClient.useSession();
  return (
    <Stack>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
