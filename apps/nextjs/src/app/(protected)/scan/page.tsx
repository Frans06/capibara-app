"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@capibara/ui/button";
import { toast } from "@capibara/ui/toast";

import { useTRPC } from "~/trpc/react";

export default function ScanPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [statusText, setStatusText] = useState("");

  const createUploadUrl = useMutation(
    trpc.receipt.createUploadUrl.mutationOptions(),
  );
  const scanReceipt = useMutation(
    trpc.receipt.scan.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          void queryClient.invalidateQueries(trpc.receipt.pathFilter());
          router.push(`/receipts/${data.receiptId}`);
        } else {
          toast.error(
            "Could not extract receipt data. Please try again with a clearer photo.",
          );
        }
        setStatusText("");
      },
      onError: () => {
        toast.error("Failed to scan receipt.");
        setStatusText("");
      },
    }),
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUploadAndScan = async () => {
    if (!file) return;

    try {
      setStatusText("Getting upload URL...");
      const { uploadUrl, receiptId } = await createUploadUrl.mutateAsync({
        contentType: "image/jpeg",
      });

      setStatusText("Uploading image...");
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setStatusText("Scanning receipt...");
      await scanReceipt.mutateAsync({ receiptId });
    } catch {
      toast.error("Failed to upload and scan receipt.");
      setStatusText("");
    }
  };

  const isLoading =
    createUploadUrl.isPending || scanReceipt.isPending || !!statusText;

  return (
    <main className="container max-w-2xl py-16">
      <h1 className="mb-8 text-3xl font-bold">Scan Receipt</h1>

      <div className="flex flex-col gap-6">
        {preview ? (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border">
            <Image
              src={preview}
              alt="Receipt preview"
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary hover:bg-muted"
          >
            <p className="text-lg text-muted-foreground">
              Click to select a receipt image
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              JPG, PNG or HEIC
            </p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic"
          onChange={handleFileChange}
          className="hidden"
        />

        {statusText ? (
          <p className="text-center text-sm text-muted-foreground">
            {statusText}
          </p>
        ) : null}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {preview ? "Change Image" : "Select Image"}
          </Button>

          {preview ? (
            <Button
              className="flex-1"
              onClick={handleUploadAndScan}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Scan Receipt"}
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
