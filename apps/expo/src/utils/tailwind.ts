import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const useColorScheme = () => {
  const { colorScheme, setColorScheme, toggleColorScheme } =
    useNativewindColorScheme();
  return {
    colorScheme: colorScheme ?? "dark",
    isDarkColorScheme: colorScheme === "dark",
    setColorScheme: (scheme: "light" | "dark") => setColorScheme(scheme),
    toggleColorScheme: () => toggleColorScheme(),
  };
};

export const NAV_THEME = {
  light: {
    background: "hsl(0 0% 100%)", // --background (white)
    border: "hsl(0 0% 90%)", // --border (light-gray)
    card: "hsl(0 0% 100%)", // --card (white)
    notification: "hsl(11 35% 58%)", // --destructive (old-rose)
    primary: "hsl(4 35% 8%)", // --primary (licorice)
    text: "hsl(4 35% 8%)", // --foreground (licorice)
  },
  dark: {
    background: "hsl(4 35% 8%)", // --background (licorice)
    border: "hsl(10 8% 15%)", // --border (raisin-black)
    card: "hsl(4 35% 8%)", // --card (licorice)
    notification: "hsl(11 35% 58%)", // --destructive (old-rose)
    primary: "hsl(0 0% 100%)", // --primary (white)
    text: "hsl(0 0% 100%)", // --foreground (white)
  },
};
