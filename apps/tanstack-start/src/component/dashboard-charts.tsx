import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@capibara/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@capibara/ui/card";
import type { ChartConfig } from "@capibara/ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@capibara/ui/chart";

import type { Granularity } from "~/lib/dashboard-store";

type Receipt = RouterOutputs["receipt"]["all"][number];

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Number of buckets shown per granularity.
const WINDOW = { week: 12, month: 12, year: 6 } as const;
const RANGE_LABEL: Record<Granularity, string> = {
  week: "Last 12 weeks",
  month: "Last 12 months",
  year: "Last 6 years",
};
const PERIOD_NOUN: Record<Granularity, string> = {
  week: "week",
  month: "month",
  year: "year",
};

// --- aggregation -----------------------------------------------------------

function receiptDate(r: Receipt): Date {
  // receiptDate is a 'YYYY-MM-DD' string; fall back to upload time.
  if (r.receiptDate) return new Date(`${r.receiptDate}T00:00:00`);
  return new Date(r.createdAt);
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (x.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  x.setDate(x.getDate() - mondayOffset);
  return x;
}

function bucketKey(d: Date, g: Granularity): string {
  if (g === "year") return `${d.getFullYear()}`;
  if (g === "month")
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return startOfWeek(d).toISOString().slice(0, 10);
}

// The bucket key + display label for the i-th period back from now (0 = current).
function periodAt(g: Granularity, back: number): { key: string; label: string } {
  const now = new Date();
  if (g === "year") {
    const y = now.getFullYear() - back;
    return { key: `${y}`, label: `${y}` };
  }
  if (g === "month") {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label =
      MONTH_LABELS[d.getMonth()] +
      (d.getMonth() === 0 ? ` '${String(d.getFullYear()).slice(2)}` : "");
    return { key, label };
  }
  const ws = startOfWeek(now);
  ws.setDate(ws.getDate() - back * 7);
  return {
    key: ws.toISOString().slice(0, 10),
    label: `${MONTH_LABELS[ws.getMonth()]} ${ws.getDate()}`,
  };
}

export interface DashboardStats {
  count: number;
  totalSpent: number;
  avgReceipt: number;
  taxTipPaid: number;
  periodPct: number | null;
  periodNoun: string;
  rangeLabel: string;
  currency: string;
  series: { label: string; total: number }[];
  byCategory: { category: string; label: string; total: number }[];
  byMerchant: { name: string; total: number }[];
}

const num = (v: string | null): number => (v ? Number(v) || 0 : 0);

export function useDashboardStats(
  receipts: Receipt[],
  granularity: Granularity,
): DashboardStats {
  return useMemo(() => {
    const currency =
      mostFrequent(
        receipts.map((r) => r.currency).filter((c): c is string => !!c),
      ) ?? "$";

    let totalSpent = 0;
    let taxTipPaid = 0;
    let withTotal = 0;
    const catMap = new Map<string, number>();
    const merchMap = new Map<string, number>();
    const bucketMap = new Map<string, number>();

    for (const r of receipts) {
      const total = num(r.total);
      totalSpent += total;
      if (total > 0) withTotal += 1;
      taxTipPaid += num(r.tax) + num(r.tip);

      const cat = r.category ?? "uncategorized";
      catMap.set(cat, (catMap.get(cat) ?? 0) + total);

      const merchant = r.storeName?.trim() ?? "Unknown";
      merchMap.set(merchant, (merchMap.get(merchant) ?? 0) + total);

      const key = bucketKey(receiptDate(r), granularity);
      bucketMap.set(key, (bucketMap.get(key) ?? 0) + total);
    }

    // Continuous window so empty periods render as zero bars (oldest → newest).
    const n = WINDOW[granularity];
    const series: { label: string; total: number }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const { key, label } = periodAt(granularity, i);
      series.push({ label, total: round2(bucketMap.get(key) ?? 0) });
    }

    const cur = bucketMap.get(periodAt(granularity, 0).key) ?? 0;
    const prev = bucketMap.get(periodAt(granularity, 1).key) ?? 0;
    const periodPct = prev > 0 ? ((cur - prev) / prev) * 100 : null;

    const byCategory = [...catMap.entries()]
      .map(([category, total]) => ({
        category,
        label: titleCase(category),
        total: round2(total),
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);

    const byMerchant = [...merchMap.entries()]
      .map(([name, total]) => ({ name, total: round2(total) }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);

    return {
      count: receipts.length,
      totalSpent: round2(totalSpent),
      avgReceipt: withTotal ? round2(totalSpent / withTotal) : 0,
      taxTipPaid: round2(taxTipPaid),
      periodPct,
      periodNoun: PERIOD_NOUN[granularity],
      rangeLabel: RANGE_LABEL[granularity],
      currency,
      series,
      byCategory,
      byMerchant,
    };
  }, [receipts, granularity]);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function mostFrequent(arr: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  let max = 0;
  for (const [v, c] of counts) if (c > max) ((max = c), (best = v));
  return best;
}

export function fmtMoney(currency: string, n: number): string {
  const sym = currency.length <= 2 ? currency : `${currency} `;
  return `${sym}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// --- charts ----------------------------------------------------------------

export function SpendingOverTimeChart({ stats }: { stats: DashboardStats }) {
  const config = {
    total: { label: "Spent", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending over time</CardTitle>
        <CardDescription>{stats.rangeLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <BarChart data={stats.series} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => fmtMoney(stats.currency, v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => fmtMoney(stats.currency, Number(value))}
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryDonutChart({ stats }: { stats: DashboardStats }) {
  const config: ChartConfig = {};
  stats.byCategory.forEach((c, i) => {
    config[c.category] = {
      label: c.label,
      color: PALETTE[i % PALETTE.length],
    };
  });

  if (stats.byCategory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by category</CardTitle>
          <CardDescription>No categorized spend yet</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          Categories appear once receipts are processed.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>Share of total spend</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="mx-auto aspect-square h-[260px]"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="category"
                  formatter={(value) => fmtMoney(stats.currency, Number(value))}
                />
              }
            />
            <Pie
              data={stats.byCategory}
              dataKey="total"
              nameKey="category"
              innerRadius={60}
              strokeWidth={3}
            >
              {stats.byCategory.map((c, i) => (
                <Cell key={c.category} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="category" />}
              className="flex-wrap"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function TopMerchantsChart({ stats }: { stats: DashboardStats }) {
  const config = {
    total: { label: "Spent", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  if (stats.byMerchant.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top merchants</CardTitle>
          <CardDescription>No spend recorded yet</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          Your highest-spend stores will show here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top merchants</CardTitle>
        <CardDescription>Highest total spend</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="aspect-auto h-[260px] w-full"
        >
          <BarChart
            data={stats.byMerchant}
            layout="vertical"
            margin={{ left: 12, right: 16 }}
            accessibilityLayer
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={110}
              tickFormatter={(v: string) =>
                v.length > 16 ? `${v.slice(0, 15)}…` : v
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => fmtMoney(stats.currency, Number(value))}
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
