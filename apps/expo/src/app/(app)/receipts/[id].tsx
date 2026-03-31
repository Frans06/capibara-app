import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useGlobalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function ReceiptDetail() {
  const { id } = useGlobalSearchParams();
  if (!id || typeof id !== "string") throw new Error("unreachable");

  const { data, isLoading } = useQuery(
    trpc.receipt.byId.queryOptions({ id }),
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ title: "Receipt", headerShown: true }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const currencySymbol =
    data.currency === "USD"
      ? "$"
      : data.currency === "EUR"
        ? "\u20AC"
        : data.currency ?? "$";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: data.merchantName ?? "Receipt",
          headerShown: true,
        }}
      />
      <ScrollView className="flex-1 p-4">
        <View className="gap-4">
          {/* Header */}
          <View className="rounded-lg bg-muted p-4 gap-2">
            <Text className="text-2xl font-bold text-foreground">
              {data.merchantName ?? "Unknown merchant"}
            </Text>
            {data.receiptDate ? (
              <Text className="text-muted-foreground">{data.receiptDate}</Text>
            ) : null}
            <View className="self-start rounded-full bg-primary/10 px-3 py-1">
              <Text className="text-sm capitalize text-primary">
                {data.status}
              </Text>
            </View>
          </View>

          {/* Line Items */}
          {data.items.length > 0 ? (
            <View className="rounded-lg bg-muted p-4 gap-3">
              <Text className="text-lg font-semibold text-foreground">
                Items
              </Text>
              {data.items.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between border-b border-border pb-2"
                >
                  <View className="flex-1">
                    <Text className="text-foreground">{item.description}</Text>
                    {item.quantity && Number(item.quantity) !== 1 ? (
                      <Text className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                        {item.unitPrice
                          ? ` x ${currencySymbol}${Number(item.unitPrice).toFixed(2)}`
                          : ""}
                      </Text>
                    ) : null}
                  </View>
                  {item.totalPrice ? (
                    <Text className="font-semibold text-foreground">
                      {currencySymbol}
                      {Number(item.totalPrice).toFixed(2)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Total */}
          {data.totalAmount ? (
            <View className="rounded-lg bg-primary/10 p-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">
                Total
              </Text>
              <Text className="text-2xl font-bold text-primary">
                {currencySymbol}
                {Number(data.totalAmount).toFixed(2)}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
