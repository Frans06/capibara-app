import type { Extraction } from "./extract";

// Per-field weights. Sum = 100 by construction, so the result of
// `computeScore` is already a percentage (0–100).
const WEIGHTS = {
  total: 20,
  items: 17,
  storeName: 15,
  receiptDate: 15,
  currency: 5,
  subtotal: 5,
  tax: 5,
  category: 5,
  storeAddress: 5,
  paymentMethod: 4,
  tip: 4,
} as const;

type WeightKey = keyof typeof WEIGHTS;

export function computeScore(extraction: Extraction): number {
  let score = 0;
  for (const key of Object.keys(WEIGHTS) as WeightKey[]) {
    if (key === "items") {
      if (extraction.items && extraction.items.length > 0) score += WEIGHTS.items;
    } else if (extraction[key] !== null && extraction[key] !== "") {
      score += WEIGHTS[key];
    }
  }
  return Math.round(score);
}
