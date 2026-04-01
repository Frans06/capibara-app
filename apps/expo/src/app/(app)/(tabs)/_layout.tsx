import { Tabs } from "expo-router";
import { Home, Receipt, ScanLine } from "lucide-react-native";

import { useColorScheme } from "~/utils/tailwind";

export default function TabsLayout() {
  const { isDarkColorScheme } = useColorScheme();

  const activeTint = isDarkColorScheme ? "#a78bfa" : "#7c3aed";
  const inactiveTint = isDarkColorScheme ? "#71717a" : "#a1a1aa";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          backgroundColor: isDarkColorScheme ? "#09090b" : "#ffffff",
          borderTopColor: isDarkColorScheme ? "#27272a" : "#e4e4e7",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <ScanLine size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: "Receipts",
          tabBarIcon: ({ color, size }) => (
            <Receipt size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
