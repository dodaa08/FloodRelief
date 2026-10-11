# Rahat — flood relief, connected

Citizens report needs, responders verify them, volunteers deliver help — on one live map.

## Stack

- `apps/web` — Next.js 16 + Tailwind + shadcn (port 3000)
- `apps/be` — Bun + Express API (port 8000)
- `packages/db` — Prisma 7 + PostGIS
- Photos: local disk or S3 · OTP/SMS: console (dev) or Twilio/SNS

## Run it

```sh
bun install

# Postgres with PostGIS on :5432, db `floodrelief`
# apps/be/.env → DATABASE_URL, JWT_SECRET (see .env for the rest)

cd packages/db && bunx prisma migrate deploy && bun run seed:districts && cd ../..
bun run dev   # or separately: apps/be `bun run dev`, apps/web `bun run dev`
```

Frontend talks to `http://localhost:8000/api/v1` (`NEXT_PUBLIC_API_URL`).

## Flow

1. Sign in with phone + OTP (code prints to the backend log in dev).
2. Citizen reports a need (+ photo, + district) → `SUBMITTED`.
3. NGO verifies (call, check photos) → `VERIFIED` → shows on the live map.
4. Volunteer claims → delivers → marks complete → `FULFILLED`.

Roles: `CITIZEN` (auto-approved) · `VOLUNTEER` / `NGO_COORDINATOR` (admin-approved) · `ADMIN` (`bun run make-admin <phone>` in `apps/be`).
