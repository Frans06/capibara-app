import { create } from "zustand";

export type Granularity = "week" | "month" | "year";

interface DashboardState {
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  granularity: "month",
  setGranularity: (granularity) => set({ granularity }),
}));
