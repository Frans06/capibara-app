"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@capibara/api";
import { cn } from "@capibara/ui";
import { Badge } from "@capibara/ui/badge";
import { Card, CardContent } from "@capibara/ui/card";
import { Skeleton } from "@capibara/ui/skeleton";

import { useTRPC } from "~/trpc/react";

type Receipt = RouterOutputs["receipt"]["list"][number];

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const currencySymbol =
    receipt.currency === "USD"
      ? "$"
      : receipt.currency === "EUR"
        ? "\u20AC"
        : (receipt.currency ?? "$");

  return (
    <Link href={`/receipts/${receipt.id}`}>
      <Card className="transition-colors hover:bg-muted/80">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold">
              {receipt.merchantName ?? "Unknown merchant"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {receipt.receiptDate ?? "No date"}
            </p>
            <Badge
              className={cn(
                "w-fit capitalize",
                receipt.status === "completed"
                  ? "border-green-500/20 bg-green-500/10 text-green-600"
                  : receipt.status === "failed"
                    ? "border-red-500/20 bg-red-500/10 text-red-600"
                    : "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
              )}
            >
              {receipt.status}
            </Badge>
          </div>
          {receipt.totalAmount ? (
            <span className="text-xl font-bold">
              {currencySymbol}
              {Number(receipt.totalAmount).toFixed(2)}
            </span>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function ReceiptList() {
  const trpc = useTRPC();
  const { data: receipts } = useSuspenseQuery(
    trpc.receipt.list.queryOptions(),
  );

  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">No receipts yet</p>
        <Link
          href="/scan"
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Scan your first receipt
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {receipts.map((receipt) => (
        <ReceiptCard key={receipt.id} receipt={receipt} />
      ))}
    </div>
  );
}

export function ReceiptCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20" />
      </CardContent>
    </Card>
  );
}
