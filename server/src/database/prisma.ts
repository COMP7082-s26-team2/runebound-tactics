import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// Colyseus runs as a separate Node process from the Next app, so it owns its
// own Prisma client even though it connects to the same database.
if (!connectionString) {
    throw new Error("DATABASE_URL is required for the Colyseus server");
}

// PrismaPg adapts Prisma Client to the pg connection pool used by this server process.
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Shared singleton for Colyseus room/auth code. Do not import the Next app's
// client/src/lib/prisma.ts across package boundaries.
export const prisma = new PrismaClient({ adapter });
