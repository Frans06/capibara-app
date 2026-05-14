import { authRouter } from "./router/auth";
import { receiptRouter } from "./router/receipt";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  receipt: receiptRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
