import type { AssistantResponse, CalendarEvent } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listEvents(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const q = params.toString();
    return request<{ events: CalendarEvent[] }>(`/api/events${q ? `?${q}` : ''}`);
  },

  createEvent(event: Omit<CalendarEvent, 'id'> & { id?: string }) {
    return request<{ event: CalendarEvent }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  updateEvent(id: string, patch: Partial<CalendarEvent>) {
    return request<{ event: CalendarEvent }>(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteEvent(id: string) {
    return request<{ event: CalendarEvent }>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  },

  askAssistant(message: string) {
    return request<AssistantResponse>('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  resetDemo() {
    return request<{ ok: boolean; events: CalendarEvent[] }>('/api/reset', {
      method: 'POST',
    });
  },

  undo() {
    return request<{ events: CalendarEvent[]; canUndo: boolean }>('/api/undo', {
      method: 'POST',
    });
  },

  canUndo() {
    return request<{ canUndo: boolean }>('/api/undo');
  },
};
