# Prisma Setup Guide for Developers

This guide provides step-by-step instructions to set up and maintain the Prisma ORM in the Runebound Tactics project.

## 🛠️ Prerequisites
- **Node.js**: v20 or v22 (LTS recommended). 
  - *Note: Studio has known issues with v25.*
- **Yarn**: The project's mandated package manager.
- **Aiven Account**: Access to the project's PostgreSQL database.

---

## 1. Environment Configuration
Create or update your `.env` file in the project root with the following variables:

```env
# Aiven PostgreSQL Connection
DATABASE_URL="postgresql://avnadmin:[PASSWORD]@[HOST]:[PORT]/defaultdb?sslmode=no-verify&schema=public"
```

> [!IMPORTANT]
> The `sslmode=no-verify&schema=public` parameters are required for the Prisma CLI to correctly introspect the Aiven database without certificate chain errors.

---

## 2. Install & Synchronize
Run these commands to ensure your local environment matches the database schema:

```bash
# 1. Install dependencies (if not already done)
yarn install

# 2. Pull the latest schema from the database
yarn prisma db pull

# 3. Generate the type-safe Prisma Client
yarn prisma generate
```

---

## 3. Database Maintenance (Migrations)
We use a **baselining** strategy objects to protect existing seed data in Aiven.

### To make a change to the schema:
1. Update `database/schema.sql` (Source of Truth).
2. Apply changes to Aiven (via SQL editor).
3. Run `yarn prisma db pull` to sync `schema.prisma`.
4. Run `yarn prisma generate` to refresh types.

### To initialize migrations on a fresh DB:
```bash
yarn prisma migrate dev --name init --create-only
yarn prisma migrate resolve --applied [MIGRATION_NAME]
```

---

## 4. Usage in Next.js
Always import the singleton client to avoid connection leaks:

```typescript
import prisma from '@/lib/prisma';

// Example: Fetching players
const players = await prisma.player.findMany();
```

> [!TIP]
> **BigInt Handling**: PostgreSQL IDs are `BigInt`. The project includes a global fix in `src/lib/prisma.ts` that automatically converts these to `strings` when sending JSON to the frontend.

---

## 5. Troubleshooting
If you encounter **`Could not load schema metadata`** in Prisma Studio:
1. It is likely an SSL Proxy issue or Node version conflict.
2. Use **DBeaver** or the **Aiven Console** for visual data management instead.
3. Your application code will continue to work perfectly even if Studio fails.
