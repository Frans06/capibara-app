import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { LegendList } from "@legendapp/list";
import { useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { trpc } from "~/utils/api";

type Receipt = RouterOutputs["receipt"]["list"][number];

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <Link
      asChild
      href={{
        pathname: "/receipts/[id]",
        params: { id: receipt.id },
      }}
    >
      <Pressable className="flex-row items-center justify-between rounded-lg bg-muted p-4">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">
            {receipt.merchantName ?? "Unknown merchant"}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {receipt.receiptDate ?? "No date"}
          </Text>
          <View className="mt-1 self-start rounded-full bg-primary/10 px-2 py-0.5">
            <Text className="text-xs capitalize text-primary">
              {receipt.status}
            </Text>
          </View>
        </View>
        {receipt.totalAmount ? (
          <Text className="text-xl font-bold text-foreground">
            {receipt.currency === "USD" ? "$" : receipt.currency}{" "}
            {Number(receipt.totalAmount).toFixed(2)}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

export default function ReceiptsList() {
  const { data, isLoading } = useQuery(trpc.receipt.list.queryOptions());

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Receipts", headerShown: true }} />
      <View className="flex-1 p-4">
        {isLoading ? (
          <Text className="text-center text-muted-foreground">Loading...</Text>
        ) : !data?.length ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-muted-foreground">
              No receipts yet
            </Text>
            <Link asChild href="/scan">
              <Pressable className="mt-4 rounded-lg bg-primary px-6 py-3">
                <Text className="font-semibold text-primary-foreground">
                  Scan your first receipt
                </Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <LegendList
            data={data}
            estimatedItemSize={80}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={(p) => <ReceiptCard receipt={p.item} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
