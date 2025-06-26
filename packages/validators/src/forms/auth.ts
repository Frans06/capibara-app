import { z } from "zod/v4";

import { DEFAULT_TEXT_LENGTH } from "../constants";
import { errors } from "../errors";
import { passwordSchema } from "../utils";

export const loginValidator = () =>
  z.object({
    email: z.email(errors.email),
    password: z.string(),
  });

export const signupValidator = () =>
  z
    .object({
      name: z.string().max(DEFAULT_TEXT_LENGTH, errors.maxLengthErrorMessage),
      email: z.email(errors.email),
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: errors.passwordMismatchErrorMessage,
      path: ["confirmPassword"],
    });
