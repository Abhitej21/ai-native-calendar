# Pulse — AI-native Calendar

Working prototype of an **AI-native Google Calendar** for business users. Calendar is the system of record; **Pulse** is the operating layer that briefs, protects focus, and reshuffles time.

> Built as a take-home prototype: mock Google Calendar data + Demo AI assistant on a real Express API. Designed so Google Calendar API and LLM tool-calling plug into the same seams.

## Quick start (local)

```bash
cd ai-native-calendar
npm run install:all
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:3001/api/health  

No API keys required.

## Demo script (interview)

1. Open the app — seeded busy week for **Abhiteja**. Note the **Day Health** score.
2. Chip: **Brief me on today** → conflicts, prep, soft meetings, load.
3. Use **Resolve conflicts** / **Decline soft** on the Day Health card (one-click hygiene).
4. Chip: **Protect 2 hours of focus tomorrow morning** → focus block + flagged soft conflict.
5. Chip: **Move my 1:1 with Priya to Friday afternoon** → event moves on the grid.
6. Hit **Undo** (or ⌘/Ctrl+Z) — shows AI changes are reversible.
7. Press **⌘/Ctrl+K** — command palette for power-user flows.

## Architecture

```
client/   Vite + React + TypeScript + Tailwind + Zustand
server/   Express + TypeScript
  CalendarService     domain (list/create/update/delete/slots/briefing/protectFocus)
  demoAi.ts           intent → tools (swap for LLM tool-calling later)
  /api/*              REST + POST /api/assistant
```

Production: `npm run build && npm start` builds the client and serves it from Express on `PORT` (default 3001).

## Live demo

Preferred: deploy the repo as a **Render** free Web Service.

- Build: `npm run install:all && npm run build`
- Start: `npm start`
- Health: `/api/health`

Same-day fallback: run `npm run build && npm start` locally, then expose with:

```bash
npx localtunnel --port 3001
```

## What I’d ship next

- Real Google OAuth + Calendar API behind `CalendarService`
- LLM tool-calling on `/api/assistant` (same tool surface as Demo AI)
- Multi-calendar, time zones, RSVP suggestions, meeting prep from Docs/Mail

See [THOUGHT_PROCESS.md](./THOUGHT_PROCESS.md) for product reasoning.
