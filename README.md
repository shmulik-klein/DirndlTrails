# DirndlTrails ![image](https://github.com/user-attachments/assets/e399dfbc-fe88-48da-b4d3-5987d5e4bbfe)

A Next.js app that plots hiking trails in Bavaria on an interactive Leaflet map.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

| Command             | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run build`     | Production build                 |
| `npm start`         | Serve the production build       |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run lint`      | Next.js lint                     |

## Adding a hike

Click **Add hike** on the map. The slide-over form covers trail details, a
location picker (click the map, drag the pin, or use your current location),
and optional photo links. New hikes appear on the map immediately and are
saved to [`data/hikes.json`](data/hikes.json) through `POST /api/hikes`.

Validation is shared between the form and the API via Zod schemas in
`src/lib/hikeSchema.ts`.

> **Note:** hikes are stored in a JSON file on the server. This works for local
> and self-hosted deployments. Serverless hosts with a read-only filesystem
> (e.g. Vercel) need a database instead — swap the adapter in
> `src/lib/hikeStore.ts` and keep the API contract unchanged.

## Project layout

- `src/pages/index.tsx` — map page, loads hikes with `getServerSideProps`
- `src/pages/api/hikes.ts` — `GET` (list) and `POST` (create) endpoints
- `src/components/Map.tsx` — Leaflet map and hike popups
- `src/components/hikes/` — add-hike drawer, form, coordinate picker, photos
- `src/lib/` — Zod schemas, JSON store, formatting, Leaflet icon fix
- `data/hikes.json` — hike data
