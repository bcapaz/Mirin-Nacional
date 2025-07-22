import pkg from "pg";
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: postgresql://postgres:#Idbsf0305@db.cyltnomeebcexvtgnduj.supabase.co:5432/postgres,
});
export const db = drizzle(pool, { schema });