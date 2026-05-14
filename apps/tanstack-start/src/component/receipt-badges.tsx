import { cn } from "@capibara/ui";

export function ScoreBadge({ score }: { score: number }) {
  const band = score >= 71 ? "good" : score >= 41 ? "partial" : "poor";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm",
        band === "good" && "bg-green-500 text-white",
        band === "partial" && "bg-yellow-500 text-white",
        band === "poor" && "bg-red-500 text-white",
      )}
      title={`Extraction completeness: ${score}%`}
    >
      {score}%
    </span>
  );
}

export function CategoryTag({ category }: { category: string }) {
  return (
    <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
      {category}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status === "processed" &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "pending" &&
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        status === "failed" &&
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      )}
    >
      {status}
    </span>
  );
}
