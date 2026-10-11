# Rahat — disaster relief, connected

<img src="apps/web/public/cover.jpg" alt="Flood survivors being rescued by boat" width="640" />

When disaster hits, help exists but can't find the people who need it. Rahat closes that gap: affected citizens report what they need, verified responders confirm it, and volunteers deliver — all on one live map. Flood relief is live today; the platform is hazard-agnostic by design.

## How it works

1. **Report** — A citizen signs in with their phone number and posts a need: food, water, rescue, shelter. A photo and location go with it.
2. **Verify** — An approved NGO coordinator calls the number, checks the photos, and confirms the need is genuine. Verified needs appear on the public live map.
3. **Deliver** — Volunteers see only verified tasks, claim one, and mark it complete when help arrives. Citizens watch their request move from reported to fulfilled.

## Who it's for

- **Citizens** — ask for help in under a minute, track it to fulfilment.
- **Volunteers** — see confirmed, actionable work near you. No noise, no duplicates.
- **NGOs** — review incoming reports, verify with evidence, coordinate teams from one feed.
- **Admins** — approve responders and organizations before they can act.

## Background

Disaster response today runs on scattered phone calls, forwards, and spreadsheets. Needs get lost, volunteers duplicate each other's trips, and nobody can see the full picture. Rahat replaces that with a single shared view: live hazard data on a map, with verified human needs pinned on top — so the right help reaches the right door, faster.

The hazard layer is swappable: flood risk (rainfall + river discharge) is the first provider. A heatwave, cyclone, or any other feed can take its place without touching the needs pipeline — reporting, verification, and delivery work the same whatever the disaster.

## Run locally

```sh
bun install
cd packages/db && bunx prisma migrate deploy && bun run seed:districts && cd ../..
bun run dev
```

Web at `http://localhost:3000`, API at `http://localhost:8000/api/v1`. Copy the env template in `apps/be/.env` (database URL, secrets) before starting. In development, login codes print to the backend log.
