import { useMemo, useState } from "react";
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

import type { RouterInputs, RouterOutputs } from "@capibara/api";
import { Button } from "@capibara/ui/button";
import { Input } from "@capibara/ui/input";
import { Label } from "@capibara/ui/label";
import { toast } from "@capibara/ui/toast";

import {
  CategoryTag,
  ScoreBadge,
  StatusBadge,
} from "~/component/receipt-badges";
import { useTRPC } from "~/lib/trpc";

type ReceiptDetail = NonNullable<RouterOutputs["receipt"]["byId"]>;
type ReceiptItem = NonNullable<ReceiptDetail["items"]>[number];
type UpdateInput = RouterInputs["receipt"]["update"];

const CATEGORIES = [
  "groceries",
  "dining",
  "gas",
  "retail",
  "services",
  "entertainment",
  "travel",
  "healthcare",
  "other",
] as const;

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
  const [editing, setEditing] = useState(false);

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
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/receipts">← Back</Link>
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold">
          {receipt.storeName ?? receipt.fileName}
        </h1>
        {receipt.extractionScore !== null && !editing && (
          <ScoreBadge score={receipt.extractionScore} />
        )}
        {!editing && !confirming && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          </>
        )}
        {confirming && (
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

      <div className="flex flex-col gap-6 lg:flex-row">
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

        <div className="space-y-4 lg:w-80 xl:w-96">
          {editing ? (
            <EditForm receipt={receipt} onDone={() => setEditing(false)} />
          ) : (
            <>
              <DetailsPanel receipt={receipt} />
              {receipt.items && receipt.items.length > 0 && (
                <ItemsTable items={receipt.items} currency={receipt.currency} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsPanel({ receipt }: { receipt: ReceiptDetail }) {
  const fmtMoney = (val: string | null) => {
    if (!val) return "—";
    const prefix = receipt.currency ? `${receipt.currency} ` : "$";
    return `${prefix}${val}`;
  };

  return (
    <div className="bg-card border-border rounded-xl border p-5">
      <h2 className="mb-4 font-semibold">Details</h2>
      <dl className="space-y-3">
        <MetaRow label="Status">
          <StatusBadge status={receipt.status} />
        </MetaRow>
        {receipt.category && (
          <MetaRow label="Category">
            <CategoryTag category={receipt.category} />
          </MetaRow>
        )}
        <MetaRow label="Store">{receipt.storeName ?? "—"}</MetaRow>
        {receipt.storeAddress && (
          <MetaRow label="Address">{receipt.storeAddress}</MetaRow>
        )}
        <MetaRow label="Date">
          {receipt.receiptDate
            ? new Date(receipt.receiptDate).toLocaleDateString()
            : "—"}
        </MetaRow>
        <MetaRow label="Subtotal">{fmtMoney(receipt.subtotal)}</MetaRow>
        <MetaRow label="Tax">{fmtMoney(receipt.tax)}</MetaRow>
        {receipt.tip && <MetaRow label="Tip">{fmtMoney(receipt.tip)}</MetaRow>}
        <MetaRow label="Total">
          <span className="font-semibold">{fmtMoney(receipt.total)}</span>
        </MetaRow>
        {receipt.paymentMethod && (
          <MetaRow label="Payment">{receipt.paymentMethod}</MetaRow>
        )}
        <MetaRow label="Uploaded">
          {new Date(receipt.createdAt).toLocaleDateString()}
        </MetaRow>
        <MetaRow label="File">{receipt.fileName}</MetaRow>
        {receipt.notes && <MetaRow label="Notes">{receipt.notes}</MetaRow>}
      </dl>
    </div>
  );
}

function ItemsTable({
  items,
  currency,
}: {
  items: ReceiptItem[];
  currency: string | null;
}) {
  const sym = currency ?? "$";
  return (
    <div className="bg-card border-border rounded-xl border p-5">
      <h2 className="mb-3 font-semibold">Items ({items.length})</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-border border-b text-left text-xs uppercase tracking-wide">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 text-right font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-2 pr-2">{item.name}</td>
              <td className="py-2 text-right tabular-nums">
                {item.quantity ?? 1}
              </td>
              <td className="py-2 text-right tabular-nums">
                {item.totalPrice ? `${sym} ${item.totalPrice}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

// ---- Edit mode ----

type EditState = Omit<UpdateInput, "id">;

function receiptToEditState(receipt: ReceiptDetail): EditState {
  return {
    storeName: receipt.storeName,
    storeAddress: receipt.storeAddress,
    receiptDate: receipt.receiptDate,
    currency: receipt.currency,
    subtotal: receipt.subtotal,
    tax: receipt.tax,
    tip: receipt.tip,
    total: receipt.total,
    paymentMethod: receipt.paymentMethod,
    category: receipt.category,
    items: receipt.items,
    notes: receipt.notes,
  };
}

function EditForm({
  receipt,
  onDone,
}: {
  receipt: ReceiptDetail;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [state, setState] = useState<EditState>(() =>
    receiptToEditState(receipt),
  );

  const update = useMutation(
    trpc.receipt.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.receipt.pathFilter());
        toast.success("Receipt updated");
        onDone();
      },
      onError: (err) => toast.error(err.message || "Failed to update"),
    }),
  );

  const set =
    <K extends keyof EditState>(key: K) =>
    (value: EditState[K]) =>
      setState((s) => ({ ...s, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({ id: receipt.id, ...state });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-card border-border space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Edit details</h2>

        <TextField label="Store" value={state.storeName} onChange={set("storeName")} />
        <TextField label="Address" value={state.storeAddress} onChange={set("storeAddress")} />
        <DateField label="Date" value={state.receiptDate} onChange={set("receiptDate")} />

        <SelectField
          label="Category"
          value={state.category}
          onChange={(v) => set("category")(v as EditState["category"])}
          options={CATEGORIES}
        />

        <TextField
          label="Currency"
          value={state.currency}
          onChange={(v) => set("currency")(v ? v.toUpperCase().slice(0, 3) : null)}
          placeholder="USD"
        />

        <div className="grid grid-cols-2 gap-3">
          <NumericField label="Subtotal" value={state.subtotal} onChange={set("subtotal")} />
          <NumericField label="Tax" value={state.tax} onChange={set("tax")} />
          <NumericField label="Tip" value={state.tip} onChange={set("tip")} />
          <NumericField label="Total" value={state.total} onChange={set("total")} />
        </div>

        <TextField
          label="Payment"
          value={state.paymentMethod}
          onChange={set("paymentMethod")}
        />

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs">
            Notes
          </Label>
          <textarea
            id="notes"
            value={state.notes ?? ""}
            onChange={(e) =>
              set("notes")(e.target.value === "" ? null : e.target.value)
            }
            className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full min-w-0 rounded-md border px-3 py-1.5 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            rows={3}
          />
        </div>
      </div>

      <ItemsEditor
        items={state.items}
        currency={state.currency}
        onChange={set("items")}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onDone}
          disabled={update.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function ItemsEditor({
  items,
  currency,
  onChange,
}: {
  items: ReceiptItem[] | null;
  currency: string | null;
  onChange: (items: ReceiptItem[] | null) => void;
}) {
  const list = useMemo(() => items ?? [], [items]);
  const sym = currency ?? "$";

  function update(i: number, patch: Partial<ReceiptItem>) {
    onChange(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function remove(i: number) {
    const next = list.filter((_, idx) => idx !== i);
    onChange(next.length === 0 ? null : next);
  }
  function add() {
    onChange([
      ...list,
      { name: "", quantity: 1, unitPrice: null, totalPrice: null },
    ]);
  }

  return (
    <div className="bg-card border-border rounded-xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Items ({list.length})</h2>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          + Add
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm">No items.</p>
      ) : (
        <div className="space-y-2">
          {list.map((item, i) => (
            <div
              key={i}
              className="border-border grid grid-cols-[1fr_60px_90px_auto] items-center gap-2 border-b pb-2 last:border-b-0 last:pb-0"
            >
              <Input
                placeholder="Item"
                value={item.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="h-8"
              />
              <Input
                placeholder="Qty"
                inputMode="decimal"
                value={item.quantity ?? ""}
                onChange={(e) =>
                  update(i, {
                    quantity:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="h-8 text-right tabular-nums"
              />
              <Input
                placeholder={`${sym} 0.00`}
                inputMode="decimal"
                value={item.totalPrice ?? ""}
                onChange={(e) =>
                  update(i, {
                    totalPrice:
                      e.target.value === "" ? null : e.target.value,
                  })
                }
                className="h-8 text-right tabular-nums"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive rounded p-1 text-xs"
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value)
        }
        placeholder={placeholder}
      />
    </div>
  );
}

function NumericField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value)
        }
        className="text-right tabular-nums"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="date"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value)
        }
      />
    </div>
  );
}

function SelectField<T extends readonly string[]>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: T;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value)
        }
        className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
