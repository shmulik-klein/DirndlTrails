# DirndlTrails ![image](https://github.com/user-attachments/assets/e399dfbc-fe88-48da-b4d3-5987d5e4bbfe)

[![CI](https://github.com/shmulik-klein/DirndlTrails/actions/workflows/ci.yml/badge.svg)](https://github.com/shmulik-klein/DirndlTrails/actions/workflows/ci.yml)

A Next.js app that plots hiking trails in Bavaria on an interactive Leaflet map.
The map is public and read-only for visitors; a single admin can sign in to add
hikes, remove them, and export the data.

## Requirements

- **Node.js 22** — pinned in [`.nvmrc`](.nvmrc) and used by CI and Docker
  (`engines` allows 22–24)
- **npm** 10 or newer
- A [MapTiler](https://www.maptiler.com/) API key, free tier is enough. Without
  it the app starts, but the basemap tiles do not render.

## Quick start (local development)

```bash
git clone https://github.com/shmulik-klein/DirndlTrails.git
cd DirndlTrails

nvm use                 # Node 22 from .nvmrc
npm ci                  # reproducible install from package-lock.json

cp .env.example .env.local
chmod 600 .env.local

# Generate the two secrets, then paste them into .env.local:
openssl rand -base64 48                              # SESSION_SECRET
npm run hash-password -- "a long admin passphrase"   # ADMIN_PASSWORD_HASH

$EDITOR .env.local      # also set NEXT_PUBLIC_MAPTILER_KEY and APP_ORIGIN
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The map is readable
without signing in; go to [http://localhost:3000/login](http://localhost:3000/login)
to sign in as admin.

`.env.local` is gitignored. Keep `ADMIN_PASSWORD_HASH` byte-for-byte as
generated — it uses `:` separators because Next.js expands `$` sequences inside
`.env*` files and would corrupt a `$`-delimited hash.

### Environment variables

The server validates its environment on the first request and fails with a
message naming any missing or malformed variable.

| Variable                   | Required | Default                 | Purpose                                                        |
| -------------------------- | -------- | ----------------------- | -------------------------------------------------------------- |
| `SESSION_SECRET`           | yes      | —                       | Signs the admin session JWT (32+ characters)                   |
| `ADMIN_PASSWORD_HASH`      | yes      | —                       | scrypt hash from `npm run hash-password`                       |
| `NEXT_PUBLIC_MAPTILER_KEY` | yes\*    | —                       | Basemap tiles; inlined at build time, so rebuild after changes |
| `DATA_DIR`                 | no       | `./data`                | Directory holding `hikes.json` and `quarantine/`               |
| `SEED_FILE`                | no       | `<DATA_DIR>/hikes.seed.json` | Seed read when `hikes.json` is missing                    |
| `APP_ORIGIN`               | yes      | —                       | Origin used for CSRF checks and canonical URLs                 |
| `LOG_LEVEL`                | no       | `info`                  | `fatal`…`silent` pino level                                    |
| `TRUST_PROXY`              | no       | `true`                  | Read client IP from proxy headers; `false` if exposed directly  |
| `SENTRY_DSN`               | no       | —                       | Enables error reporting when set                               |

\* Required for a usable map, not for the server to boot.

## Scripts

| Command                 | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Development server with hot reload             |
| `npm run build`         | Production build (standalone output)           |
| `npm start`             | Preview the production build (see caveats)     |
| `npm run lint`          | ESLint (flat config)                           |
| `npm run lint:fix`      | ESLint with autofix                            |
| `npm run typecheck`     | TypeScript check without emitting              |
| `npm test`              | Unit tests (Vitest)                            |
| `npm run test:watch`    | Unit tests in watch mode                       |
| `npm run test:coverage` | Unit tests with a coverage report in `coverage/` |
| `npm run verify`        | Lint + typecheck + tests + build (what CI runs) |
| `npm run hash-password` | Generate `ADMIN_PASSWORD_HASH`                 |

## Running a production build locally

```bash
npm run build
npm start
```

Two caveats, both by design:

- `next.config.ts` sets `output: "standalone"` for the Docker image, so
  `next start` prints a warning about it. The preview still serves the app;
  ignore the warning for local use.
- The build runs with `NODE_ENV=production`, so the session cookie is `Secure`
  and prefixed `__Host-`. Browsers will not keep it over plain
  `http://localhost`, meaning **admin sign-in will not stick here**. Use
  `npm run dev` to exercise sign-in locally, or run behind TLS (Docker + Caddy
  below) for a realistic production check.

## Running in Docker

### Local container, HTTP only

Build the image (the MapTiler key is baked in at build time):

```bash
docker build \
  --build-arg NEXT_PUBLIC_MAPTILER_KEY="$NEXT_PUBLIC_MAPTILER_KEY" \
  -t dirndltrails:local .

docker run --rm -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  -e ADMIN_PASSWORD_HASH="$(node scripts/hash-password.mjs 'local-passphrase' | sed -n 's/^ADMIN_PASSWORD_HASH=//p')" \
  -e APP_ORIGIN="http://localhost:3000" \
  -e DATA_DIR=/data \
  -v dirndltrails-local-data:/data \
  dirndltrails:local
```

Check it with `curl -fsS http://localhost:3000/api/health`. The same Secure
cookie rule applies, so treat this as a read-only check of the image; the
container's own healthcheck uses the same endpoint.

### Full stack with TLS (server or VPS)

The repo ships `docker-compose.yml` with the app on an internal network behind
Caddy, which obtains a Let's Encrypt certificate automatically:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
$EDITOR .env.production    # DOMAIN, ACME_EMAIL, secrets, MapTiler key

docker compose --env-file .env.production up -d --build
```

The stack publishes only ports 80/443; the app is reachable only through Caddy.
Hike data lives in the named volume `dirndltrails_data`. `--env-file` is
required — without it compose cannot interpolate `DOMAIN` and the build args.

See [`deploy/README.md`](deploy/README.md) for the full runbook: DNS and
firewall prerequisites, updating, backups and restore, bind-mount permissions,
health checks, and the hardening checklist.

> **Single instance only.** Rate limiting is in memory and the store uses a
> file lock. Do not run more than one `app` container against the same volume.

## Admin access

Only the admin can add or remove hikes and export data. Sign in at `/login`
with the passphrase you hashed into `ADMIN_PASSWORD_HASH`. Sessions last seven
days in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Signing
out clears it.

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

## API

| Endpoint              | Method   | Access | Purpose                          |
| --------------------- | -------- | ------ | -------------------------------- |
| `/api/hikes`          | `GET`    | public | List hikes                       |
| `/api/hikes`          | `POST`   | admin  | Create a hike                    |
| `/api/hikes/:id`      | `DELETE` | admin  | Remove a hike                    |
| `/api/export`         | `GET`    | admin  | Download all hikes as JSON       |
| `/api/health`         | `GET`    | public | Liveness plus store status (503 when the data file is unusable) |
| `/api/auth/login`     | `POST`   | public | Exchange the admin passphrase for a session cookie |
| `/api/auth/logout`    | `POST`   | public | Clear the session cookie         |

Write requests are rejected when the browser's `Origin` does not match
`APP_ORIGIN`, and anonymous writes get `401`. Repeated failed logins are rate
limited and return `429`.

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| `Invalid server environment configuration` | A required variable is missing or malformed; the error names it. Regenerate the hash with `npm run hash-password` — it must look like `scrypt:N:r:p:salt:hash`. |
| Login "works" but you stay signed out | Session cookies are `Secure` in production, so they are dropped over plain HTTP. Use `npm run dev`, or serve the app over HTTPS. |
| `/api/health` returns `503` (`"store":"error"`) | The data directory is not writable or `hikes.json` is corrupt. Fix ownership (`uid 1001` in Docker) or restore a backup; the file is never overwritten on corruption. |
| Map renders but tiles are blank | `NEXT_PUBLIC_MAPTILER_KEY` is missing or was changed after the build. It is inlined at build time, so rebuild (or restart `npm run dev`). |
| `Another next dev server is already running` | Only one dev server per project directory. Stop the other one or open the URL it prints. |
| Port 3000 already in use | `npm run dev -- -p 3001` (and set `APP_ORIGIN=http://localhost:3001`). |
| Compose complains about `DOMAIN` | Always pass `--env-file .env.production`; plain `docker compose up` cannot interpolate it. |

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:

- **verify** — lint, typecheck, unit tests with coverage, production build, and
  `npm audit --omit=dev`
- **docker** — builds the image and smoke-tests it: health endpoint, seeded
  data, signed-out UI, rejected anonymous writes, admin login
- **dependency review** — fails a PR that introduces a high-severity
  vulnerable dependency (pull requests only)

Dependabot opens weekly grouped PRs for npm, GitHub Actions, and Docker base
images. Next.js/React majors are intentionally left for manual upgrades. To
require green checks before merging, enable branch protection for `main` and
select **Lint, types, tests, build** and **Build and smoke-test image** as
required status checks.

## Project layout

- `src/pages/index.tsx` — map page, loads hikes with `getServerSideProps`
- `src/pages/login.tsx` — admin sign-in
- `src/pages/api/` — REST endpoints (see [API](#api))
- `src/components/Map.tsx` — Leaflet map and hike popups
- `src/components/hikes/` — add-hike drawer, form, coordinate picker, photos
- `src/lib/` — Zod schemas, JSON store, auth, rate limiting, env validation,
  logging, Leaflet icon fix
- `src/proxy.ts` — CSP with per-request nonces, security headers, write-API guard
- `data/hikes.json` — hike data
- `data/hikes.seed.json` — tracked copy used to bootstrap an empty data volume
- `Dockerfile`, `docker-compose.yml`, `deploy/` — production deployment
- `.github/workflows/ci.yml` — CI pipeline
