import { z } from "zod/v4";

export const loginValidator = () =>
  z.object({
    email: z.email("error.generic.email"),
    password: z.string(),
  });
