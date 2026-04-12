"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@capibara/ui";
import { Button } from "@capibara/ui/button";

import { useTRPC } from "~/trpc/react";

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.receipt.byId.queryOptions({ id }),
  );

  if (isLoading) {
    return (
      <main className="container max-w-2xl py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container max-w-2xl py-16">
        <p className="text-muted-foreground">Receipt not found.</p>
        <Link href="/receipts">
          <Button variant="outline" className="mt-4">
            Back to Receipts
          </Button>
        </Link>
      </main>
    );
  }

  const currencySymbol =
    data.currency === "USD"
      ? "$"
      : data.currency === "EUR"
        ? "\u20AC"
        : (data.currency ?? "$");

  return (
    <main className="container max-w-2xl py-16">
      <Link
        href="/receipts"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary"
      >
        &larr; Back to Receipts
      </Link>

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-lg bg-muted p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {data.merchantName ?? "Unknown merchant"}
              </h1>
              {data.receiptDate ? (
                <p className="mt-1 text-muted-foreground">
                  {data.receiptDate}
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm capitalize",
                data.status === "completed"
                  ? "bg-green-500/10 text-green-600"
                  : data.status === "failed"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-yellow-500/10 text-yellow-600",
              )}
            >
              {data.status}
            </span>
          </div>
        </div>

        {/* Line Items */}
        {data.items.length > 0 ? (
          <div className="rounded-lg bg-muted p-6">
            <h2 className="mb-4 text-lg font-semibold">Items</h2>
            <div className="space-y-3">
              {data.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p>{item.description}</p>
                    {item.quantity && Number(item.quantity) !== 1 ? (
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                        {item.unitPrice
                          ? ` x ${currencySymbol}${Number(item.unitPrice).toFixed(2)}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  {item.totalPrice ? (
                    <span className="font-semibold">
                      {currencySymbol}
                      {Number(item.totalPrice).toFixed(2)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Total */}
        {data.totalAmount ? (
          <div className="flex items-center justify-between rounded-lg bg-primary/10 p-6">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">
              {currencySymbol}
              {Number(data.totalAmount).toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
