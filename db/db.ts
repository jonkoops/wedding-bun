import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { environment } from "../environment";
import * as schema from "./schema";

const client = postgres(environment.databaseUrl);
export const db = drizzle(client, { schema });

export async function initializeDatabase() {
  const migrationClient = postgres(environment.databaseUrl, { max: 1 });
  const migrationDb = drizzle(migrationClient);

  await migrate(migrationDb, { migrationsFolder: "migrations" })
}
