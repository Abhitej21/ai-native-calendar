import { Router } from 'express';
import { CalendarService, calendarService } from './calendarService.js';
import { handleAssistantMessage } from './demoAi.js';
import { buildSeedEvents } from './seed.js';
import type { CreateEventInput, UpdateEventInput } from './types.js';

export const apiRouter = Router();

/** Mutable service reference so /api/reset can reseed the demo week. */
let service: CalendarService = calendarService;

export function getCalendarService(): CalendarService {
  return service;
}

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pulse-api' });
});

apiRouter.post('/reset', (_req, res) => {
  service = new CalendarService(buildSeedEvents());
  res.json({ ok: true, events: service.list() });
});

apiRouter.get('/events', (req, res) => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  res.json({ events: service.list(from, to) });
});

apiRouter.post('/events', (req, res) => {
  const body = req.body as CreateEventInput;
  if (!body?.title || !body?.start || !body?.end) {
    res.status(400).json({ error: 'title, start, and end are required' });
    return;
  }
  service.checkpoint();
  const event = service.create(body);
  res.status(201).json({ event });
});

apiRouter.patch('/events/:id', (req, res) => {
  service.checkpoint();
  const updated = service.update(req.params.id, req.body as UpdateEventInput);
  if (!updated) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json({ event: updated });
});

apiRouter.delete('/events/:id', (req, res) => {
  service.checkpoint();
  const removed = service.delete(req.params.id);
  if (!removed) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json({ event: removed });
});

apiRouter.get('/undo', (_req, res) => {
  res.json({ canUndo: service.canUndo() });
});

apiRouter.post('/undo', (_req, res) => {
  const events = service.undo();
  if (!events) {
    res.status(400).json({ error: 'Nothing to undo' });
    return;
  }
  res.json({ events, canUndo: service.canUndo() });
});

apiRouter.get('/slots', (req, res) => {
  const duration = Number(req.query.duration ?? 30);
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to are required' });
    return;
  }
  res.json({ slots: service.findFreeSlots(duration, from, to) });
});

apiRouter.get('/briefing', (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  res.json({ briefing: service.getBriefing(date) });
});

apiRouter.post('/assistant', (req, res) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  const result = handleAssistantMessage(service, message);
  res.json(result);
});
