import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } =
    useNativewindColorScheme();
  return {
    colorScheme: colorScheme ?? "dark",
    isDarkColorScheme: colorScheme === "dark",
    setColorScheme,
    toggleColorScheme,
  };
}

export const NAV_THEME = {
  light: {
    background: "oklch(1 0 0)", // background
    border: "oklch(0.92 0 0)", // border
    card: "oklch(1 0 0)", // card
    notification: "oklch(0.58 0.22 25)", // destructive
    primary: "oklch(0.22 0.02 80)", // primary
    text: "oklch(0.22 0.02 80)", // foreground
  },
  dark: {
    background: "oklch(0.22 0.02 80)", // background
    border: "oklch(0.56 0.01 358)", // border
    card: "oklch(0.25 0 0)", // card
    notification: "oklch(0.65 0.25 25)", // destructive
    primary: "oklch(0.85 0.13 50)", // primary
    text: "oklch(1 0 0)", // foreground
  },
};
