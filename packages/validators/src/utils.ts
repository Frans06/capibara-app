import { z } from "zod/v4";

import { errors } from "./errors";

export const passwordSchema = z
  .string()
  .min(8, { message: errors.minLengthErrorMessage })
  .max(20, { message: errors.maxLengthErrorMessage })
  .refine((password) => /[A-Z]/.test(password), {
    message: errors.uppercaseErrorMessage,
  })
  .refine((password) => /[a-z]/.test(password), {
    message: errors.lowercaseErrorMessage,
  })
  .refine((password) => /[0-9]/.test(password), {
    message: errors.numberErrorMessage,
  })
  .refine((password) => /[!@#$%^&*]/.test(password), {
    message: errors.specialCharacterErrorMessage,
  });
