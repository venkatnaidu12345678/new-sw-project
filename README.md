# new-sw-project

Share Wheels — carpooling, passenger requests, courier delivery, admin panel, and live ride tracking.

## Projects

| Folder | Description |
|--------|-------------|
| `Share-wheels-backend` | Node.js + Express + MongoDB API (port 3001) |
| `share-wheels-mobile` | React Native mobile app |
| `share-wheels-admin` | React admin dashboard (Vite, port 5173) |

## Quick start

### Backend

```bash
cd Share-wheels-backend
npm install
# Add .env with MONGO_URI and JWT_SECRET
npm run dev
```

### Mobile

```bash
cd share-wheels-mobile
npm install
npm start
# In another terminal:
npm run android
```

Set `LAN_HOST` in `share-wheels-mobile/src/Config.js` to your PC IP for a physical device, or use the Android emulator (`10.0.2.2`).

### Admin

```bash
cd share-wheels-admin
npm install
npm run dev
```

## Features

- Driver & passenger rides with pricing
- Courier requests
- En-route passenger pickup
- Driver–passenger chat
- Live GPS tracking (admin Leaflet map)
- Admin user/ride management
