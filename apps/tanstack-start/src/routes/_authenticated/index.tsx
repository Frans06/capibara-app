import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@capibara/ui/button";
import { Card, CardContent } from "@capibara/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@capibara/ui/tabs";

import {
  CategoryDonutChart,
  fmtMoney,
  SpendingOverTimeChart,
  TopMerchantsChart,
  useDashboardStats,
} from "~/component/dashboard-charts";
import type { Granularity } from "~/lib/dashboard-store";
import { useDashboardStore } from "~/lib/dashboard-store";
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
  const { data: receipts } = useSuspenseQuery(trpc.receipt.all.queryOptions());
  const granularity = useDashboardStore((s) => s.granularity);
  const setGranularity = useDashboardStore((s) => s.setGranularity);
  const stats = useDashboardStats(receipts, granularity);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {session.user.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here's a look at where your money is going.
          </p>
        </div>
        {receipts.length > 0 && (
          <Tabs
            value={granularity}
            onValueChange={(v) => setGranularity(v as Granularity)}
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              No receipts yet — upload one to see your spending insights.
            </p>
            <Button asChild>
              <Link to="/receipts">Upload a receipt</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total tracked"
              value={fmtMoney(stats.currency, stats.totalSpent)}
            />
            <StatCard
              label="Avg receipt"
              value={fmtMoney(stats.currency, stats.avgReceipt)}
            />
            <StatCard
              label="Tax + tip paid"
              value={fmtMoney(stats.currency, stats.taxTipPaid)}
            />
            <StatCard
              label={`This vs last ${stats.periodNoun}`}
              value={
                stats.periodPct === null
                  ? "—"
                  : `${stats.periodPct >= 0 ? "+" : ""}${stats.periodPct.toFixed(0)}%`
              }
              tone={
                stats.periodPct === null
                  ? undefined
                  : stats.periodPct <= 0
                    ? "good"
                    : "bad"
              }
            />
          </div>

          <SpendingOverTimeChart stats={stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryDonutChart stats={stats} />
            <TopMerchantsChart stats={stats} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <Card className="gap-0 py-5">
      <CardContent>
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </p>
        <p
          className={
            "mt-1 text-xl font-semibold sm:text-2xl " +
            (tone === "good"
              ? "text-emerald-600 dark:text-emerald-500"
              : tone === "bad"
                ? "text-destructive"
                : "text-foreground")
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
