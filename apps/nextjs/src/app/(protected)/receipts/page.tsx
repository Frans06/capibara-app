import { Suspense } from "react";
import Link from "next/link";

import { Button } from "@capibara/ui/button";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ReceiptList, ReceiptCardSkeleton } from "./_components/receipt-list";

export default function ReceiptsPage() {
  prefetch(trpc.receipt.list.queryOptions());

  return (
    <HydrateClient>
      <main className="container max-w-2xl py-16">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Receipts</h1>
          <Link href="/scan">
            <Button>Scan Receipt</Button>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <ReceiptCardSkeleton />
              <ReceiptCardSkeleton />
              <ReceiptCardSkeleton />
            </div>
          }
        >
          <ReceiptList />
        </Suspense>
      </main>
    </HydrateClient>
  );
}
