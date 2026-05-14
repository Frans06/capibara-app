import { useRef, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import type { RouterOutputs } from "@capibara/api";
import { cn } from "@capibara/ui";
import { Button } from "@capibara/ui/button";
import { Label } from "@capibara/ui/label";
import { toast } from "@capibara/ui/toast";

import {
  CategoryTag,
  ScoreBadge,
  StatusBadge,
} from "~/component/receipt-badges";
import { useTRPC } from "~/lib/trpc";

export const Route = createFileRoute("/_authenticated/receipts/")({
  loader: ({ context: { trpc, queryClient } }) => {
    void queryClient.prefetchQuery(trpc.receipt.all.queryOptions());
  },
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload and manage your receipts
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={uploading}>
          Upload receipt
        </Button>
      </div>

      {dialogOpen && (
        <UploadDialog
          onClose={() => setDialogOpen(false)}
          onUploading={setUploading}
        />
      )}

      <ReceiptGrid />
    </div>
  );
}

function UploadDialog({
  onClose,
  onUploading,
}: {
  onClose: () => void;
  onUploading: (v: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getUploadUrl = useMutation(trpc.receipt.getUploadUrl.mutationOptions());
  const createReceipt = useMutation(
    trpc.receipt.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.receipt.pathFilter());
        toast.success("Receipt uploaded");
        onClose();
      },
    }),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);
    onUploading(true);

    try {
      const { uploadUrl, fileKey } = await getUploadUrl.mutateAsync({
        fileName: file.name,
        mimeType: file.type,
      });

      const upload = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!upload.ok) throw new Error("Upload to R2 failed");

      await createReceipt.mutateAsync({
        fileKey,
        fileName: file.name,
        mimeType: file.type,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
      onUploading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2">
        <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Upload receipt</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <input
                id="file"
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                required
                className="text-foreground file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              <p className="text-muted-foreground text-xs">
                Accepts images (JPG, PNG, WEBP) and PDF
              </p>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function ReceiptGrid() {
  const trpc = useTRPC();
  const { data: receipts } = useSuspenseQuery(trpc.receipt.all.queryOptions());

  if (receipts.length === 0) {
    return (
      <div className="border-border flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
        <ReceiptEmptyIcon />
        <p className="text-muted-foreground mt-3 text-sm">No receipts yet</p>
        <p className="text-muted-foreground text-xs">
          Upload your first receipt to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {receipts.map((r) => (
        <ReceiptCard key={r.id} receipt={r} />
      ))}
    </div>
  );
}

function ReceiptCard({
  receipt,
}: {
  receipt: RouterOutputs["receipt"]["all"][number];
}) {
  const isImage = receipt.mimeType.startsWith("image/");
  return (
    <Link
      to="/receipts/$id"
      params={{ id: receipt.id }}
      className="bg-card border-border hover:border-ring group flex flex-col rounded-xl border p-4 transition-colors"
    >
      {/* Thumbnail */}
      <div className="bg-muted relative mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg">
        {isImage ? (
          <img
            src={receipt.viewUrl}
            alt={receipt.fileName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileIcon className="text-muted-foreground size-8" />
        )}
        {receipt.extractionScore !== null && (
          <div className="absolute top-1.5 right-1.5">
            <ScoreBadge score={receipt.extractionScore} />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-foreground line-clamp-1 text-sm font-medium">
          {receipt.storeName ?? receipt.fileName}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">
            {receipt.receiptDate
              ? new Date(receipt.receiptDate).toLocaleDateString()
              : new Date(receipt.createdAt).toLocaleDateString()}
          </p>
          {receipt.category && <CategoryTag category={receipt.category} />}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-foreground text-sm font-semibold">
          {receipt.total
            ? `${receipt.currency ?? "$"} ${receipt.total}`
            : "—"}
        </span>
        <StatusBadge status={receipt.status} />
      </div>
    </Link>
  );
}


function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ReceiptEmptyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground size-10"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8H8" />
      <path d="M16 12H8" />
      <path d="M12 16H8" />
    </svg>
  );
}
