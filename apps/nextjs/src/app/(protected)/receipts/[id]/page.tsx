"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@capibara/ui";
import { Badge } from "@capibara/ui/badge";
import { Button } from "@capibara/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@capibara/ui/card";
import { Skeleton } from "@capibara/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@capibara/ui/table";

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
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
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
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {data.merchantName ?? "Unknown merchant"}
                </CardTitle>
                {data.receiptDate ? (
                  <p className="mt-1 text-muted-foreground">
                    {data.receiptDate}
                  </p>
                ) : null}
              </div>
              <Badge
                className={cn(
                  "capitalize",
                  data.status === "completed"
                    ? "border-green-500/20 bg-green-500/10 text-green-600"
                    : data.status === "failed"
                      ? "border-red-500/20 bg-red-500/10 text-red-600"
                      : "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
                )}
              >
                {data.status}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Line Items */}
        {data.items.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity ?? 1}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.unitPrice
                          ? `${currencySymbol}${Number(item.unitPrice).toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.totalPrice
                          ? `${currencySymbol}${Number(item.totalPrice).toFixed(2)}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {data.totalAmount ? (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold text-primary">
                        {currencySymbol}
                        {Number(data.totalAmount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
