import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@capibara/ui/button";

import { useTRPC } from "~/lib/trpc";

export const Route = createFileRoute("/_authenticated/")({
  loader: ({ context: { trpc, queryClient } }) => {
    void queryClient.prefetchQuery(trpc.receipt.all.queryOptions());
  },
  component: DashboardPage,
});

function DashboardPage() {
  const trpc = useTRPC();
  const { session } = Route.useRouteContext();
  const { data: receipts } = useSuspenseQuery(
    trpc.receipt.all.queryOptions(),
  );

  const totalSpent = receipts.reduce((sum, r) => {
    return r.total ? sum + Number(r.total) : sum;
  }, 0);

  const processed = receipts.filter((r) => r.status === "processed").length;
  const pending = receipts.filter((r) => r.status === "pending").length;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session.user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here's a quick look at your receipts.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Receipts" value={receipts.length.toString()} />
        <StatCard
          label="Total tracked"
          value={
            totalSpent > 0 ? `$${totalSpent.toFixed(2)}` : "—"
          }
        />
        <StatCard
          label="Status"
          value={`${processed} processed · ${pending} pending`}
        />
      </div>

      <Button asChild>
        <Link to="/receipts">Go to receipts</Link>
      </Button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border-border rounded-xl border p-5">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="text-foreground mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
