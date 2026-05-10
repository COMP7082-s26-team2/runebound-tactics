# Prisma Setup Guide for Developers (Supabase)

This guide provides step-by-step instructions to set up the Prisma ORM for the new Supabase backend.

## 1. Environment Configuration
Update your `.env` file with your Supabase connection strings. 

```env
# Supabase Pooled Connection (Port 6543) - Used by the Application
DATABASE_URL="postgresql://postgres.nqwxihvcnbwzbhkitgzq:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection (Port 5432) - Used for Migrations/DDL
DIRECT_URL="postgresql://postgres.nqwxihvcnbwzbhkitgzq:[PASSWORD]@db.nqwxihvcnbwzbhkitgzq.supabase.co:5432/postgres"
```

## 2. Sync & Connect
Run these commands to synchronize your local code with the current main Supabase database:

```bash
# 1. Install project dependencies
yarn install

# 2. Sync: Pull the latest schema from the main database
yarn prisma db pull

# 3. Connect: Refresh the type-safe client (from schema.prisma)
yarn prisma generate
```

---

## 3. Usage in Next.js
Always import the singleton client from `@/lib/prisma`:

```typescript
import prisma from '@/lib/prisma';

// Fetch cards
const cards = await prisma.card.findMany();
```

> [!TIP]
> **BigInt Handling**: PostgreSQL IDs are automatically converted to `strings` in JSON responses via the fix in `src/lib/prisma.ts`.
