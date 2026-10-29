# Deploying DirndlTrails

Runs two containers on a single host:

- **app** — the Next.js server (non-root, uid 1001) on an internal network
- **caddy** — TLS termination and reverse proxy; the only service with published ports

Hike data lives in the named volume `dirndltrails_data`, mounted at `/data`.
On first start the empty volume is bootstrapped from the seed baked into the
image (`data/hikes.seed.json`).

## Prerequisites

- A Linux host with Docker Engine 24+ and the Compose plugin
- A DNS `A`/`AAAA` record for your domain pointing at the host
- Inbound TCP 80 and 443 (and UDP 443 for HTTP/3) open in the firewall
- Nothing else listening on 80/443

Caddy obtains and renews the certificate automatically. Set `DOMAIN` to the
public hostname and `APP_ORIGIN` to the same value with `https://`.

## First deploy

```bash
git clone https://github.com/shmulik-klein/DirndlTrails.git
cd DirndlTrails

cp .env.production.example .env.production
chmod 600 .env.production
$EDITOR .env.production

# Generate the two secrets:
openssl rand -base64 48          # -> SESSION_SECRET
npm run hash-password -- "a long unique admin passphrase"   # -> ADMIN_PASSWORD_HASH

docker compose --env-file .env.production up -d --build
```

`npm run hash-password` needs Node 22+ locally; alternatively run it in a
throwaway container:

```bash
docker run --rm -it -v "$PWD:/app" -w /app node:22-bookworm-slim \
  node scripts/hash-password.mjs "a long unique admin passphrase"
```

Check the stack:

```bash
docker compose --env-file .env.production ps
curl -fsS https://trails.example.com/api/health
docker compose --env-file .env.production logs -f app caddy
```

Then open `https://trails.example.com` and sign in. Only signed-in requests can
add or remove hikes; visitors get the read-only map.

> **Single instance only.** Rate limiting is in-memory and the store uses a
> file lock. Do not run more than one `app` replica against the same volume.

## Updating

```bash
git pull
docker compose --env-file .env.production up -d --build
```

The data volume is untouched. `NEXT_PUBLIC_MAPTILER_KEY` is baked in at build
time, so rebuild after changing it.

## Backups

`deploy/backup.sh` archives the data volume into `./backups` and prunes
archives older than `RETENTION_DAYS` (default 30):

```bash
./deploy/backup.sh
```

Cron example (daily at 03:15):

```cron
15 3 * * * cd /srv/dirndltrails && BACKUP_DIR=/mnt/backups ./deploy/backup.sh >> /var/log/dirndltrails-backup.log 2>&1
```

Copy `BACKUP_DIR` off the host (rsync, restic, object storage) — a backup on
the same disk does not survive disk loss. `.env.production` should be backed up
separately because it holds `SESSION_SECRET` and `ADMIN_PASSWORD_HASH`.

### Restore

```bash
docker compose --env-file .env.production stop app

docker run --rm \
  -v dirndltrails_data:/data \
  -v "$PWD/backups:/backup:ro" \
  alpine:3.20 \
  sh -c 'rm -rf /data/* && tar xzf /backup/dirndltrails-<stamp>.tar.gz -C /data'

docker compose --env-file .env.production start app
```

A stale `.store.lock` from a crash is ignored after 20 seconds, so restoring
inside the volume is safe. Corrupt records are never deleted silently: they are
copied to `/data/quarantine/` before being dropped from the map.

## Using a bind mount instead of a named volume

Replace the app's volume entry in `docker-compose.yml`:

```yaml
    volumes:
      - /srv/dirndltrails/data:/data
```

The container runs as uid/gid 1001, so prepare the directory first:

```bash
sudo install -d -o 1001 -g 1001 -m 750 /srv/dirndltrails/data
```

If ownership is wrong the app still starts, but `/api/health` returns `503` and
the UI shows a load error.

## Local smoke test

Build and run the production image without Caddy (HTTP only):

```bash
docker build \
  --build-arg NEXT_PUBLIC_MAPTILER_KEY="$NEXT_PUBLIC_MAPTILER_KEY" \
  -t dirndltrails:test .

docker run --rm -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  -e ADMIN_PASSWORD_HASH="$(node scripts/hash-password.mjs 'local-test-password' | sed -n 's/^ADMIN_PASSWORD_HASH=//p')" \
  -e APP_ORIGIN="http://localhost:3000" \
  -v dirndltrails-test-data:/data \
  dirndltrails:test
```

`Secure` session cookies mean browsers will not keep the login over plain
HTTP; test sign-in behind HTTPS (or through a TLS terminator) in production.

## Hardening checklist

- [ ] `.env.production` is mode `600` and never committed
- [ ] Admin passphrase is unique and long (12+ characters; 20+ preferred)
- [ ] MapTiler key restricted to your domain
- [ ] Host firewall allows only 22, 80, 443
- [ ] Off-host backups scheduled and a restore has been tested
- [ ] `docker compose ps` shows the app as `healthy`
