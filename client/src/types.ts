export type EventKind = 'meeting' | 'focus' | 'personal' | 'hold';
export type EventPriority = 'hard' | 'soft';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees?: string[];
  kind: EventKind;
  priority: EventPriority;
  location?: string;
}

export interface BriefingItem {
  type: 'conflict' | 'focus_gap' | 'prep' | 'load' | 'suggestion';
  message: string;
  eventIds?: string[];
}

export interface DailyBriefing {
  date: string;
  summary: string;
  items: BriefingItem[];
  meetingCount: number;
  focusMinutes: number;
}

export interface AssistantAction {
  type: 'created' | 'updated' | 'deleted' | 'briefing' | 'slots' | 'info';
  message: string;
  eventId?: string;
}

export interface AssistantResponse {
  reply: string;
  actions: AssistantAction[];
  events: CalendarEvent[];
  briefing?: DailyBriefing;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
