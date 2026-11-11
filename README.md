# SORSU TALK Frontend

React 18 + Vite single-page app for anonymous one-to-one chat, plus the admin panel.

It talks to two services:

- **Laravel API** (`Sochat-Backend`): sessions, matching, messages, reports, admin.
- **WebSocket server** (`webscoket`): real-time matching, messages, typing and chat-end events.
  If it is unreachable the app falls back to REST polling.

## Setup

```bash
npm install
cp .env.example .env   # adjust URLs if needed
npm run dev            # http://localhost:5173
```

Start the backend (port 8000) and the WebSocket server (port 3001) first; see their READMEs.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with a `/api` proxy to `127.0.0.1:8000` |
| `npm run build` | Production build into `dist/` |
| `npm run build:clean` | Clears caches, then builds (used by Vercel) |
| `npm run lint` | ESLint |
| `npm test` | Vitest (watch); `npx vitest run` for a single run |

## Environment

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Laravel API base, e.g. `https://sochat-backend.onrender.com/api/v1` |
| `VITE_WEBSOCKET_URL` | WebSocket server URL |
| `VITE_POLLING_INTERVAL_*` | REST polling intervals (ms) when the WebSocket is down |

## How it works

- `GuestContext` creates an anonymous session and keeps it in `sessionStorage`, so a reload
  keeps the same guest and returns to an active chat. A new tab is a new guest.
- `ChatContext` handles matching, messages and ending chats, over Socket.IO when connected
  and REST otherwise.
- Admins log in at `/admin/login`; the API returns a bearer token stored in `localStorage`.

## Deployment

Vercel, using `vercel.json` (`npm run build:clean`, output `dist`). Set `VITE_API_BASE_URL`
and `VITE_WEBSOCKET_URL` in the Vercel project. The backend only accepts browser requests
from this project's `sochat*.vercel.app` origins (and `FRONTEND_URL`), so add a custom domain
there if you use one.
