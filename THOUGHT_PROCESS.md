# Thought process — Pulse (AI-native Calendar)

## Problem

Google Calendar today is an excellent **record of time**. Business users don’t lack a grid — they lack an **operator** for the day: conflict resolution, focus protection, prep awareness, and low-friction reshuffling. In an AI-native world, the calendar should manage *attention*, not only appointments.

## Persona

**Abhiteja** — mid-level IC / engineering manager. Back-to-back meetings, soft “optional” invites that still consume the morning, one real conflict, almost no deep work blocked, and a 1:1 that should move.

## Product thesis

**Calendar = system of record. Pulse = operating system for the day.**

AI is not a chatbot bolted onto a week view. It is a persistent control surface that:

1. **Briefs** — what matters today (conflicts, prep, load, soft meetings).
2. **Protects** — finds and blocks focus; flags soft collisions.
3. **Reshuffles** — moves meetings with intent (“Priya 1:1 → Friday afternoon”).
4. **Surfaces load** — meeting-density intelligence, not just empty slots.
5. **Makes change safe** — Undo + Day Health + one-click conflict/soft hygiene so AI feels trustworthy, not reckless.

## Why mock Calendar + Demo AI (for this prototype)

- **Mock Google Calendar** behind `CalendarService` so the demo never fails on OAuth, and the Google API swap is obvious.
- **Demo AI** (deterministic intent → same tools) so reviewers need **no OpenAI key**, while the architecture still shows a real **backend assistant endpoint** (`POST /api/assistant`). Production replaces Demo AI with LLM tool-calling over the identical tool surface.

This is an intentional EOD tradeoff: prove the product loop and system shape, not credential plumbing.

## Architecture choices

| Choice | Why |
| --- | --- |
| Express API + Vite React | Clear SDE boundaries: client → API → domain service |
| In-memory seed week | Reliable interview script; “today” anchored to the real week |
| Zustand on FE | Thin cache over API; assistant responses return full event list |
| No Next/Vercel required | Avoid account/env friction for the first ship; one Node process for prod |

## What “10x” looks like beyond this prototype

- Auto-decline / shorten patterns based on goals
- Prep packs (agenda, related docs) before hard meetings
- Cross-timezone “find time” that respects energy, not just free/busy
- Org-level meeting hygiene (cadence budgets, no-meeting blocks)

## EOD cuts (honest)

Out of scope on purpose: real Google sync, streaming LLM, multi-user ACL, mobile, month view polish. Those belong in the “next” column once the core loop is undeniable.
