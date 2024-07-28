import fs from "node:fs/promises";
import path from "node:path";

import type { Document } from "./schema";

const DATABASE_PATH = path.resolve(process.cwd(), "data/db.json");
const INITIAL_DOCUMENT: Document = { invitations: {} };

export async function initializeDocument(): Promise<void> {
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });

  try {
    await fs.access(DATABASE_PATH, fs.constants.F_OK);
  } catch {
    await writeDocument(INITIAL_DOCUMENT);
  }
}

export async function readDocument(): Promise<Document> {
  const data = await fs.readFile(DATABASE_PATH, "utf-8");
  return JSON.parse(data);
}

export async function writeDocument(document: Document): Promise<void>{
  await fs.writeFile(DATABASE_PATH, JSON.stringify(document, null, 2));
}

export function generateId(): string {
  return crypto.randomUUID();
}
