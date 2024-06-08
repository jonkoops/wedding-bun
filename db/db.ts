import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from './schema';

const sqlite = new Database("wedding.db");
export const db = drizzle(sqlite, { schema });

export function initializeDatabase() {
  migrate(db, { migrationsFolder: "migrations" });
}
