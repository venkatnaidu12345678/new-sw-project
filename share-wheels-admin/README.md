# Share Wheels Admin Panel

React admin dashboard for Share Wheels (users, rides, passenger requests, couriers).

## Setup

```bash
cd share-wheels-admin
npm install
```

Copy `.env.example` to `.env` and set `VITE_API_URL` to your backend (default `http://localhost:3001`).

## Run

1. Start backend: `cd Share-wheels-backend && npm run dev`
2. Create an admin (once):

```bash
curl -X POST http://localhost:3001/admin/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Admin\",\"email\":\"admin@sharewheels.com\",\"mobile\":\"9999999999\",\"password\":\"admin123\"}"
```

3. Start admin UI:

```bash
cd share-wheels-admin
npm run dev
```

Open http://localhost:5173 and sign in.

## Features

- Dashboard stats
- User list + verify/unverify
- Rides list + status updates
- Passenger requests (with `amount_will`)
- Courier requests (with `amount_will`)
- **Live Tracking** — Leaflet map of started rides with driver GPS (polls every 8s)

## Live tracking

When a driver taps **Start Ride** in the mobile app, the ride appears under **Live Tracking**. Location updates every ~15s while the ride is in progress (requires location permission on the driver device).
