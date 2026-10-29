# DirndlTrails ![image](https://github.com/user-attachments/assets/e399dfbc-fe88-48da-b4d3-5987d5e4bbfe)

A Next.js app that plots hiking trails in Bavaria on an interactive Leaflet map.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

| Command                | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `npm run build`        | Production build                        |
| `npm start`            | Serve the production build              |
| `npm run typecheck`    | TypeScript check without emitting       |
| `npm run lint`         | ESLint (flat config)                    |
| `npm test`             | Unit tests (Vitest)                     |
| `npm run verify`       | Lint + typecheck + tests + build        |
| `npm run hash-password`| Generate `ADMIN_PASSWORD_HASH`          |

## Admin access

The map is public; only the admin can add or remove hikes and export data.
Create `.env.local` from `.env.example` and fill in:

- `SESSION_SECRET` — 32+ random characters (`openssl rand -base64 48`)
- `ADMIN_PASSWORD_HASH` — `npm run hash-password -- "a long passphrase"`

Then sign in at `/login`. Sessions last seven days in an `HttpOnly`,
`SameSite=Lax` cookie.

## Data storage

Hikes live in `data/hikes.json` (or `$DATA_DIR/hikes.json`). Writes are atomic
and fsynced, and read-modify-write cycles are locked, so the file survives
crashes and a maintenance script cannot clobber a concurrent request.

- Missing file? It is seeded from `data/hikes.seed.json` on first run.
- Invalid records? They are copied to `$DATA_DIR/quarantine/` and skipped.
- Corrupt JSON? The file is left untouched; `/api/health` reports `503` and the
  UI shows a load error until it is fixed or restored from a backup.

## Adding a hike

Sign in at `/login`, then click **Add hike** on the map. The slide-over form
covers trail details, a location picker (click the map, drag the pin, or use
your current location), and optional photo links. New hikes appear on the map
immediately and are saved to [`data/hikes.json`](data/hikes.json) through
`POST /api/hikes`.

Validation is shared between the form and the API via Zod schemas in
`src/lib/hikeSchema.ts`.

> **Note:** hikes are stored in a JSON file on the server. This works for local
> and self-hosted deployments. Serverless hosts with a read-only filesystem
> (e.g. Vercel) need a database instead — swap the adapter in
> `src/lib/hikeStore.ts` and keep the API contract unchanged.

## Deployment

Docker + Caddy (automatic TLS) on a single host. See
[`deploy/README.md`](deploy/README.md) for the full runbook: first deploy,
updates, backups and restore, bind-mount permissions and hardening checklist.

```bash
cp .env.production.example .env.production   # fill in DOMAIN, secrets, MapTiler key
docker compose --env-file .env.production up -d --build
```

## Project layout

- `src/pages/index.tsx` — map page, loads hikes with `getServerSideProps`
- `src/pages/api/hikes.ts` — `GET` (list) and `POST` (create) endpoints
- `src/components/Map.tsx` — Leaflet map and hike popups
- `src/components/hikes/` — add-hike drawer, form, coordinate picker, photos
- `src/lib/` — Zod schemas, JSON store, auth, formatting, Leaflet icon fix
- `data/hikes.json` — hike data
- `data/hikes.seed.json` — tracked copy used to bootstrap an empty data volume
- `Dockerfile`, `docker-compose.yml`, `deploy/` — production deployment
