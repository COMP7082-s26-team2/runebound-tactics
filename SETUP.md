# Setup

How to go from a fresh clone of `runebound-tactics` to a running dev loop. For _why_ the setup is shaped this way, see the vault design at `runebound-tactics/environment-setup/environment_setup_design_v1.0.md`.

---

## 1. Prerequisites

| Tool              | Version                                        | Notes                                                              |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| Node.js           | 18+ (20 LTS recommended)                       | Required by Next.js 16 and Prisma 7.x                              |
| Yarn              | Classic v1 (`yarn -v` → `1.22.x`)              | Berry / PnP is not supported (see §6)                              |
| Git               | Any modern version                             |                                                                    |
| PostgreSQL access | A Supabase project URL + keys                  | Hosted; no local Postgres required                                 |
| Shell             | PowerShell on Windows; bash/zsh on macOS/Linux | Commands below are POSIX-style — see §5 for PowerShell equivalents |

Verify before you start:

```bash
node -v   # v18.x or later
yarn -v   # 1.22.x
git --version
```

---

## 2. Clone and Install

```bash
git clone <repo-url> runebound-tactics
cd runebound-tactics
yarn install
```

A single root `node_modules/` and one `yarn.lock` are produced — this is a Yarn Workspaces monorepo (`client/`, `shared/`, `server/`).

---

## 3. Environment Variables

You will create three `.env` files. **None of these are committed.**

### 3.1 Root `.env` and `.env.local`

Used by the Prisma CLI when you run `prisma generate` or migrations from the repo root.

Create `.env` (and an identical `.env.local`) at the repo root:

```env
# Postgres connection (Supabase pooled URL — uses port 6543 with pgbouncer)
DATABASE_URL="postgresql://<user>:<password>@<host>:6543/<db>?pgbouncer=true"
```

Get the value from Supabase → Project Settings → Database → Connection String → "Transaction" mode.

### 3.2 `client/.env.local` (Next.js)

```env
# Supabase project URL and anon key (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Colyseus WebSocket endpoint
NEXT_PUBLIC_GAME_SERVER_URL=ws://localhost:2567
```

Supabase keys: Supabase dashboard → Project Settings → API → `anon` `public` key.

### 3.3 `server/.env` (Colyseus)

Start from the committed example:

```bash
cp server/.env.example server/.env
```

Default contents:

```env
PORT=2567
CLIENT_ORIGIN=http://localhost:3000
```

These are sufficient for local dev today. Additional server-side variables (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) land with **BCOMP-110** (database/auth integration) — see §7.

---

## 4. Generate Prisma Client and Build Shared

```bash
# Generate the Prisma client (reads root .env DATABASE_URL)
yarn workspace @runebound-tactics/client prisma generate

# Build the shared types/schemas package
yarn workspace @runebound-tactics/shared build
```

The Prisma generate step writes to `node_modules/.prisma`. Re-run it any time `prisma/schema.prisma` changes.

The shared build step is required because `shared/package.json` currently points its `main` field at `dist/index.js`. (This is a known wrinkle; see the vault design G4.)

---

## 5. Run the Dev Loop

```bash
yarn dev
```

This uses `concurrently` to start both processes:

| Process                       | Port | URL                   |
| ----------------------------- | ---- | --------------------- |
| Next.js client (`next dev`)   | 3000 | http://localhost:3000 |
| Colyseus server (`tsx watch`) | 2567 | ws://localhost:2567   |

Output is colour-coded: `client` in cyan, `server` in magenta.

To stop, press `Ctrl+C` once — `concurrently` propagates the signal to both processes.

### 5.1 Windows / PowerShell notes

All the commands above work as-is in PowerShell 7. Two differences vs. bash:

```powershell
# Use Copy-Item instead of cp
Copy-Item server\.env.example server\.env

# Backslashes in workspace flags are still fine; quotes are optional
yarn workspace '@runebound-tactics/client' prisma generate
```

---

## 6. Verify It's Working

1. Open http://localhost:3000 → Next.js app loads.
2. Server console shows: `Colyseus server listening on ws://localhost:2567`.
3. Open two browser tabs to http://localhost:3000, sign in with two different accounts, and join a lobby — they should see each other.
4. Run shared tests (sanity):
    ```bash
    yarn workspace @runebound-tactics/shared test
    ```
    Expected: ~12 suites, all passing.

---

## 7. BCOMP-110 — Database/Auth Integration (in progress)

When the database integration ticket ships, the Colyseus server will also need DB and Supabase credentials. The vault impl plan `runebound-tactics/database-server-integration/database_server_integration_impl_plan_v1.0.md` is authoritative; the short version:

1. Add to `server/.env`:
    ```env
    DATABASE_URL="postgresql://...?pgbouncer=true"
    SUPABASE_URL=https://<project>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # SECRET — never log, never send to client
    ```
2. Run `yarn workspace @runebound-tactics/server prisma generate` (will be added by the same PR).
3. Restart `yarn dev`.

Until this ticket lands, the server runs without DB access. You can develop and play games locally — only persistence and authenticated joins are gated.

---

## 8. Troubleshooting

### "Prisma schema not found"

Run from the repo root (where `prisma/schema.prisma` lives), not from `client/`. The CLI walks up from the current directory; if `DATABASE_URL` isn't found, ensure `.env` exists at the root.

### Colyseus port 2567 already in use

Either kill the orphaned process, or override:

```bash
PORT=2568 yarn workspace @runebound-tactics/server dev
```

…and update `NEXT_PUBLIC_GAME_SERVER_URL` in `client/.env.local` to match.

### Client can't reach the server (CORS / connection refused)

Confirm `server/.env` has `CLIENT_ORIGIN=http://localhost:3000` and that the Next.js port matches. If Next.js auto-picked port 3001 (when 3000 is busy), update `CLIENT_ORIGIN` and restart the server.

### Supabase RLS blocks queries

You're hitting the database with the anon key. Either:

- Add an RLS policy for the table you're querying, OR
- Verify you're signed in (Supabase tracks the session cookie automatically when using `@supabase/ssr`).

### `yarn install` fails on `node-gyp` / native modules (Windows)

Install Visual Studio Build Tools (`npm install --global windows-build-tools` is deprecated; use VS 2022 Build Tools with the "Desktop development with C++" workload). Then re-run `yarn install`.

### Shared package import resolves to nothing

The `shared/dist/` build hasn't been produced yet. Run:

```bash
yarn workspace @runebound-tactics/shared build
```

---

## 9. Useful Scripts

| Command                                                    | What it does                                             |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `yarn dev`                                                 | Run client + server in dev mode (concurrently)           |
| `yarn build`                                               | Build all workspaces in order (shared → client + server) |
| `yarn lint`                                                | Lint every workspace                                     |
| `yarn typecheck`                                           | Type-check every workspace                               |
| `yarn clean`                                               | Remove `dist/` outputs                                   |
| `yarn workspace @runebound-tactics/shared test`            | Run shared unit tests (Jest)                             |
| `yarn workspace @runebound-tactics/client prisma generate` | Regenerate Prisma client after schema change             |

---

## 10. Reference

- **Vault design (why):** `runebound-tactics/environment-setup/environment_setup_design_v1.0.md`
- **Monorepo design:** `runebound-tactics/monorepo/monorepo_design_v1.0.md`
- **DB integration plan (BCOMP-110):** `runebound-tactics/database-server-integration/database_server_integration_impl_plan_v1.0.md`
- **Repo files of interest:**
    - `package.json` (root) — workspace + scripts
    - `prisma/schema.prisma` — DB schema
    - `server/src/index.ts` — Colyseus entry point
    - `server/.env.example` — server env template (PORT, CLIENT_ORIGIN)
