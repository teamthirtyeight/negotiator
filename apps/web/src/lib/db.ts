import { createDb, type Db } from "@ghostcart/db";
import path from "node:path";

/**
 * The Postgres database for seller data (orgs, stores, catalogue, policies and, later, payments).
 * Neon when DATABASE_URL is set. Without it, local development and tests use an embedded Postgres
 * (persisted in apps/web/.pglite, or the folder PGLITE_DATA_DIR names, or in memory under Vitest);
 * production refuses to run without Neon.
 */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Seller tools need a database: set DATABASE_URL.");
  }
}

const g = globalThis as typeof globalThis & { __ghostcartDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (g.__ghostcartDb) return g.__ghostcartDb;
  if (process.env.DATABASE_URL) return (g.__ghostcartDb = Promise.resolve(createDb(process.env.DATABASE_URL)));
  if (process.env.VERCEL_ENV === "production") return Promise.reject(new DatabaseUnavailableError());
  // Vitest and next dev both run from apps/web.
  const migrations = path.resolve(process.cwd(), "../../packages/db/drizzle");
  // Tests and `next build` use a throwaway in-memory database: a build running while `next dev` holds
  // .pglite would open the same files from a second process and corrupt them.
  const ephemeral = process.env.VITEST || process.env.NEXT_PHASE === "phase-production-build";
  // A tool that runs its own dev server (scripts/haggle-reels.mts) points this at a folder of its own,
  // outside the repo: it never shares files with the developer's `next dev`, and the dev watcher never
  // sees its writes (a second data folder inside apps/web makes Turbopack reload on every request).
  const dataDir = process.env.PGLITE_DATA_DIR || ".pglite";
  g.__ghostcartDb = import("@ghostcart/db/local").then(({ createLocalDb }) => createLocalDb(migrations, ephemeral ? undefined : dataDir));
  return g.__ghostcartDb;
}
