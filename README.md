# BusScope UK

A Dockerized 3D live bus tracker for the United Kingdom. The current vertical slice includes a Google 3D map, viewport-scoped SSE updates, smooth client interpolation, selectable buses, camera follow, a provider boundary, a deterministic mock feed, MariaDB migrations and production containers.

## Start with Docker

```bash
cp .env.example .env
# Set GOOGLE_MAPS_API_KEY in .env
docker compose up --build
```

Open [https://localhost](https://localhost). The local certificate is self-signed, so the browser displays a certificate warning. The default provider reads live UK vehicles from `https://bustimes.org/vehicles.json`.

Create a local certificate before the first start:

```bash
mkdir -p docker/certs
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout docker/certs/localhost.key \
  -out docker/certs/localhost.crt \
  -subj '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
```

## Live provider

The public endpoint is configured by default. To set it explicitly, use:

```env
VEHICLE_SOURCE=bustimes
BUSTIMES_VEHICLES_URL=https://bustimes.org/vehicles.json
```

The adapter adds the configured UK bounds as `ymin`, `ymax`, `xmin` and `xmax`. Provider-specific fields stay within `apps/api/src/providers/bustimes.ts`.

## Local development

Requires Node.js 22 and pnpm 10.

```bash
corepack enable
pnpm install
pnpm build
pnpm test
```

Run MariaDB, then start the API, ingestion worker and web app in separate terminals:

```bash
pnpm --filter @bus-tracker/api dev
pnpm --filter @bus-tracker/api dev:worker
pnpm --filter @bus-tracker/web dev
```

For local Vite development, create `apps/web/.env.local` with `VITE_GOOGLE_MAPS_API_KEY=...`.

## API

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/status`
- `POST /api/v1/session`
- `PUT /api/v1/session/:id/viewport`
- `GET /api/v1/session/:id/vehicles/stream`
- `GET /api/v1/vehicles/:id`

The ingestion worker sends authenticated snapshots over the internal Docker network. Browsers only receive vehicles within a padded version of their current viewport.

## Google Maps setup

Enable Maps JavaScript API 3D for the project and restrict the browser key to the deployed site origins. The map uses the current `Map3DElement` and interactive 3D marker APIs.
