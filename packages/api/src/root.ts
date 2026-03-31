import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { receiptRouter } from "./router/receipt";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  receipt: receiptRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
