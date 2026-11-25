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

## What’s in the prototype

| Area | What you get |
| --- | --- |
| Week grid | Mon–Fri business view (8am–7pm), seeded week for **Abhiteja** |
| Drag reschedule | Drag events across time/days · snaps to **15 minutes** · toast + undo |
| Jump to date | Calendar picker to move the week anchor |
| Day Health | 0–100 score (load, conflicts, soft invites, focus) + info tip |
| One-click hygiene | **Decline soft**, **Resolve conflicts** (drops soft side; reshuffles hard↔hard), **Export agenda** |
| Pulse agent | Persistent chat + suggestion chips (stay available after each turn) |
| Demo AI intents | Brief today · protect focus · move Priya 1:1 · decline soft · resolve conflicts · find free slots |
| Safety | **Undo** / ⌘/Ctrl+Z, Reset demo, create / cancel events, toasts |

## Demo script (interview)

1. Open the app — seeded busy week for **Abhiteja**. Note the **Day Health** score (hover the **i** for what it measures).
2. Chip: **Brief me on today** → conflicts, prep, soft meetings, load.
3. Use **Resolve conflicts** / **Decline soft** on the Day Health card (one-click hygiene). Optionally **Export agenda**.
4. Chip: **Protect 2 hours of focus tomorrow morning** → focus block + flagged soft conflict.
5. Chip: **Move my 1:1 with Priya to Friday afternoon** → event moves on the grid. Or **drag** any event to a new slot.
6. Hit **Undo** (or ⌘/Ctrl+Z) — shows AI and drag changes are reversible.

## Architecture

```
client/   Vite + React + TypeScript + Tailwind + Zustand
server/   Express + TypeScript
  CalendarService     domain (CRUD / slots / briefing / protectFocus / resolveConflicts)
  demoAi.ts           intent → tools (swap for LLM tool-calling later)
  /api/*              REST + POST /api/assistant
```

Production: `npm run build && npm start` builds the client and serves it from Express on `PORT` (default 3001).

## Live demo

Preferred: deploy the repo as a **Render** free Web Service (`render.yaml` included).

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
