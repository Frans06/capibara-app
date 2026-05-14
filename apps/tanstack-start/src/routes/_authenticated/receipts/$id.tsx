import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";

import { cn } from "@capibara/ui";
import { Button } from "@capibara/ui/button";
import { toast } from "@capibara/ui/toast";

import { useTRPC } from "~/lib/trpc";

export const Route = createFileRoute("/_authenticated/receipts/$id")({
  loader: async ({ context: { trpc, queryClient }, params }) => {
    const receipt = await queryClient.fetchQuery(
      trpc.receipt.byId.queryOptions({ id: params.id }),
    );
    if (!receipt) throw notFound();
  },
  component: ReceiptDetailPage,
  notFoundComponent: () => (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Receipt not found</p>
      <Button asChild variant="outline">
        <Link to="/receipts">Back to receipts</Link>
      </Button>
    </div>
  ),
});

function ReceiptDetailPage() {
  const trpc = useTRPC();
  const { id } = Route.useParams();
  const { data: receipt } = useSuspenseQuery(
    trpc.receipt.byId.queryOptions({ id }),
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const deleteReceipt = useMutation(
    trpc.receipt.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.receipt.pathFilter());
        toast.success("Receipt deleted");
        await navigate({ to: "/receipts" });
      },
      onError: () => toast.error("Failed to delete receipt"),
    }),
  );

  if (!receipt) return null;

  const isImage = receipt.mimeType.startsWith("image/");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/receipts">← Back</Link>
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold">
          {receipt.storeName ?? receipt.fileName}
        </h1>
        {!confirming ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Are you sure?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteReceipt.mutate(receipt.id)}
              disabled={deleteReceipt.isPending}
            >
              {deleteReceipt.isPending ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Preview */}
        <div className="bg-muted flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-xl lg:min-h-[500px]">
          {isImage ? (
            <img
              src={receipt.viewUrl}
              alt={receipt.fileName}
              className="h-full w-full object-contain"
            />
          ) : (
            <iframe
              src={receipt.viewUrl}
              title={receipt.fileName}
              className="h-full w-full"
              style={{ minHeight: 500 }}
            />
          )}
        </div>

        {/* Metadata */}
        <div className="lg:w-72 xl:w-80">
          <div className="bg-card border-border rounded-xl border p-5">
            <h2 className="mb-4 font-semibold">Details</h2>
            <dl className="space-y-3">
              <MetaRow label="Status">
                <StatusBadge status={receipt.status} />
              </MetaRow>
              <MetaRow label="Store">{receipt.storeName ?? "—"}</MetaRow>
              <MetaRow label="Total">
                {receipt.total ? `$${receipt.total}` : "—"}
              </MetaRow>
              <MetaRow label="Date">
                {receipt.receiptDate
                  ? new Date(receipt.receiptDate).toLocaleDateString()
                  : "—"}
              </MetaRow>
              <MetaRow label="Uploaded">
                {new Date(receipt.createdAt).toLocaleDateString()}
              </MetaRow>
              <MetaRow label="File">{receipt.fileName}</MetaRow>
              {receipt.notes && <MetaRow label="Notes">{receipt.notes}</MetaRow>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground shrink-0 text-sm">{label}</dt>
      <dd className="text-foreground text-right text-sm">{children}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
