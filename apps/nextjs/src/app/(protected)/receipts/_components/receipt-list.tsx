"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@capibara/api";
import { cn } from "@capibara/ui";

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
      <div className="flex items-center justify-between rounded-lg bg-muted p-4 transition-colors hover:bg-muted/80">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">
            {receipt.merchantName ?? "Unknown merchant"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {receipt.receiptDate ?? "No date"}
          </p>
          <span
            className={cn(
              "inline-block w-fit rounded-full px-2 py-0.5 text-xs capitalize",
              receipt.status === "completed"
                ? "bg-green-500/10 text-green-600"
                : receipt.status === "failed"
                  ? "bg-red-500/10 text-red-600"
                  : "bg-yellow-500/10 text-yellow-600",
            )}
          >
            {receipt.status}
          </span>
        </div>
        {receipt.totalAmount ? (
          <span className="text-xl font-bold">
            {currencySymbol}
            {Number(receipt.totalAmount).toFixed(2)}
          </span>
        ) : null}
      </div>
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
    <div className="flex items-center justify-between rounded-lg bg-muted p-4">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-40 animate-pulse rounded bg-primary/20" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted-foreground/20" />
      </div>
      <div className="h-6 w-20 animate-pulse rounded bg-primary/20" />
    </div>
  );
}
