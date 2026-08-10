# Ghar Sewa Admin

Operations dashboard for Ghar Sewa — verifications, disputes, wallet approvals,
users and providers. Talks to the same NestJS backend as the mobile app.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` in `.env.local` points at the deployed API by default.

## Architecture notes

**Auth is client-side by necessity.** The API sets httpOnly cookies scoped to
its own domain, so this app's server can never read them — that rules out
Next.js middleware for route protection and any server-side data fetching.
Every page is a client component calling the API with `credentials: 'include'`,
and the guard lives in `src/lib/auth.tsx` + the dashboard layout.

**The API must allow this origin.** `CORS_ORIGIN` on the backend has to list
wherever this app runs (`http://localhost:3000` in development). Cross-site
cookies also require `sameSite: 'none'` + `secure`, which the backend already
sets in production.

**Non-admins are rejected on sign-in.** Credentials for a customer or provider
authenticate successfully against the API, so `login()` checks the role and
drops the session rather than showing an empty dashboard.

## Adding a section

1. Add the endpoint to the matching file in `src/lib/api/` (these were ported
   from the mobile app, so they already match the backend contracts).
2. Create `src/app/(dashboard)/<name>/page.tsx` as a client component.
3. Add it to `NAV` in `src/app/(dashboard)/layout.tsx`.

Shared building blocks (`Table`, `Badge`, `Button`, `StatCard`, `Pagination`)
live in `src/components/ui.tsx`.
