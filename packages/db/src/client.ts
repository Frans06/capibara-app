import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export const client = postgres(process.env.POSTGRES_URL!, { prepare: false });

export const db = drizzle({
  client,
  schema,
  casing: "snake_case",
});
