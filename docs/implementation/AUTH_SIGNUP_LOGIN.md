# Authentication Signup/Login

Documents the Supabase Auth login flow, registration handoff, session handling, and player profile mapping used by the client app.

---

## Architecture Overview

Authentication is split across UI, server actions, Supabase Auth, and the application database:

| Layer | Responsibility |
|---|---|
| Client forms | Collect user input, show loading/error/success states, and redirect after success |
| Server Actions | Run trusted auth operations from the server and return structured results |
| Supabase Auth | Own password verification, OTP verification, sessions, and auth cookies |
| Prisma/Postgres | Store application-specific `player` data linked by `auth_id` |

Gameplay and UI features should not handle passwords, OTP verification, or Supabase auth cookies directly. They should depend on a verified session and the associated player profile.

---

## Files

| File | Change |
|---|---|
| `client/src/app/auth/actions.ts` | Add login action; document Supabase Auth ownership and request-scoped server client usage |
| `client/src/app/auth/callback/route.ts` | Document auth-code exchange and idempotent player profile creation |
| `client/src/app/auth/login/page.tsx` | Login route guard that redirects authenticated users to `/dashboard` |
| `client/src/app/auth/signup/page.tsx` | Signup route guard that redirects authenticated users to `/dashboard` |
| `client/src/components/auth/login-form.tsx` | Client-side login form state, validation feedback, and success redirect |
| `client/src/components/auth/registration-form.tsx` | Client-side signup/OTP state, validation feedback, login link, and success redirect |
| `client/src/app/dashboard/page.tsx` | Protected post-login page that checks session state with `useEffect` / `useState` |
| `client/src/lib/supabase.ts` | Add request-scoped server client note; add token-expiration helper |
---

## 1. Supabase Auth Ownership

**Design:** Supabase Auth owns credentials and sessions. The app does not store password hashes, compare passwords, or create custom login sessions.

The app delegates these responsibilities to Supabase:

- user credential creation
- password verification
- OTP/email verification
- session cookie management
- sign-out cookie cleanup

The application database stores only game/profile data:

```text
player.auth_id   -> Supabase Auth user id
player.username  -> game-facing username
player.email     -> profile email reference
```

This keeps security-sensitive authentication behavior separate from gameplay and profile data.

---

## 2. Request-Scoped Supabase Server Client

**Problem:** Server-side auth code can serve many users. Each request has its own cookies/JWT.

**Design:** `createServerSideClient()` is called inside Server Actions and Route Handlers instead of being exported as a shared server singleton.

```ts
const supabase = await createServerSideClient();
```

This is intentional:

- Server Actions may run for different users.
- Supabase Auth reads and writes cookies for the current request.
- A shared server singleton would be the wrong session boundary.
- Browser-side or stateless clients can be reused more safely, but server auth clients need request context.

The comment in `client/src/lib/supabase.ts` documents this so future developers do not accidentally convert the server client into a singleton.

---

## 3. Signup Flow

Signup continues to use Supabase Auth for user creation and email verification.

```text
RegistrationForm
  -> signUp(formData)
  -> server validates required fields + password rules
  -> server checks player username/email uniqueness
  -> Supabase Auth creates pending auth user
  -> Supabase sends verification code/email
  -> UI switches to OTP verification step
```

**Important design choice:** username and email are checked in the `player` table before creating the Supabase auth user. Supabase owns the auth identity, but the app still protects game-facing profile uniqueness.

Password rules are validated on the server and mirrored in the client UI:

```text
8+ characters
at least one uppercase letter
at least one lowercase letter
at least one number
at least one symbol from @$!%*?&#
```

---

## 4. OTP Verification + Player Profile Creation

OTP verification completes signup by confirming the Supabase Auth user and creating the app-level player record.

```text
verifyOtp(email, token, username)
  -> Supabase Auth verifies signup token
  -> Supabase returns authenticated user
  -> app checks player by auth_id
  -> app creates player profile if one does not exist
  -> RegistrationForm redirects to /dashboard
```

The player profile creation is idempotent:

```ts
const existingPlayer = await prisma.player.findUnique({
    where: { auth_id: data.user.id },
});
```

If the profile already exists, the flow does not create a duplicate row.

---

## 5. Password-Based Login Flow

Login uses Supabase Auth's password flow rather than custom database password logic.

```text
LoginForm
  -> logIn(formData)
  -> server validates required fields
  -> Supabase Auth verifies email/password
  -> Supabase establishes session cookies
  -> LoginForm redirects to /dashboard
```

`logIn()` returns a simple structured result:

```ts
return { success: true };
```

or:

```ts
return { error: error.message };
```

The client form owns UI state such as input values, loading, errors, and success messages. The server action owns the credential check.

The login and signup pages also check the current Supabase session before rendering their forms. If a user is already authenticated, those pages redirect to `/dashboard` so logged-in users do not return to auth entry pages until they sign out.

---

## 6. Auth Callback Route

The callback route handles Supabase redirect flows that include a one-time auth code.

```text
/auth/callback?code=...
  -> exchangeCodeForSession(code)
  -> Supabase creates request-bound session
  -> app checks player by auth_id
  -> missing player profile is created if needed
  -> user redirects back into the app
```

**Design:** Supabase Auth confirms identity, but gameplay uses the `player` table. The callback route keeps that mapping safe by checking for an existing player before creating one.

Fallback username behavior:

- prefer `user_metadata.username`
- then `user_metadata.full_name`
- then email prefix
- then `"new_player"` with random suffix

This protects callback flows where metadata may be incomplete.

---

## 7. Protected Post-Login Route + Client Session Guard

The current login flow redirects successful users to `/dashboard`, which acts as a protected post-login verification page.

The dashboard is a client component so the session check runs after mount:

```text
DashboardPage
  -> creates browser Supabase client once with useMemo
  -> useEffect reads supabase.auth.getSession()
  -> useState stores username/loading state
  -> missing or expired session redirects to /auth/login
```

If the session is missing or expired, the user is redirected to:

```text
/auth/login
```

The client guard checks `session.expires_at`. If the token is expired, it calls `supabase.auth.signOut()` before redirecting.

This keeps the dashboard aligned with the client-side feedback pattern while avoiding repeated Supabase client creation on re-render.

---

## 8. Sign Out

Dashboard sign out uses the browser Supabase client so Supabase clears the current user's auth session from the client side.

```text
signOut()
  -> supabase.auth.signOut()
  -> redirect("/")
```

The app does not manually clear auth cookies in the dashboard. Supabase Auth owns that behavior.

---

## 9. Type Safety Cleanup

Loose `any` typings were removed from auth and Prisma code paths.

Examples:

```diff
- where: { auth_id: data.user.id } as any
+ where: { auth_id: data.user.id }
```

```diff
- catch (dbError: any) {
-     console.error(dbError.message)
+ catch (dbError: unknown) {
+     console.error(dbError instanceof Error ? dbError.message : String(dbError))
```

This lets Prisma and TypeScript catch schema/query mismatches during development instead of hiding them behind casts.

---

## 10. BigInt Serialization

PostgreSQL `BIGSERIAL` ids are returned by Prisma as JavaScript `BigInt`.

`JSON.stringify()` does not support `BigInt` by default, so the Prisma setup keeps a `toJSON()` helper:

```ts
declare global {
    interface BigInt {
        toJSON(): string;
    }
}

BigInt.prototype.toJSON = function () {
    return this.toString();
};
```

This preserves JSON-safe API responses without using `(BigInt.prototype as any)`.

---

## Main Flow

```text
User opens /auth/login
  -> LoginForm collects email/password
  -> logIn(formData) runs on the server
  -> Supabase Auth verifies credentials
  -> Supabase establishes session cookies
  -> client redirects to /dashboard
  -> dashboard useEffect validates token expiration and session
  -> authenticated content is shown
```

```text
Supabase redirects to /auth/callback?code=...
  -> callback exchanges code for session
  -> callback checks player by auth_id
  -> missing player profile is created if needed
  -> user redirects back into the app
```

---

## Verification

1. Navigate to `/auth/signup`; create a new account with a valid password.
2. Enter the OTP/email verification code; confirm a `player` row is created with `auth_id`, `username`, and `email`.
3. Navigate to `/auth/login`; sign in with the verified account.
4. Confirm successful login redirects to `/dashboard`.
5. Confirm `/dashboard` redirects unauthenticated users to `/auth/login`.
6. Click sign out; confirm the user returns to `/` and the session is cleared.
7. Run TypeScript/lint checks from the client app after auth changes.
