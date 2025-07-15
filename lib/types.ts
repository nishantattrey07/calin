export interface CalendarEvent {
  id?: string;
  summary: string;
  start: string;
  end: string;
  description?: string | null;
  location?: string | null;
  etag?: string | null;
  status?: string | null;
  updated?: string | null;
  eventType?: string | null;
  visibility?: string | null;
  source?: {
    title?: string;
    url?: string;
  } | null;
}

export interface WebhookChannel {
  id: string;
  channelId: string;
  resourceId: string;
  expiration: Date;
}

export interface SyncResult {
  events: CalendarEvent[];
  hasChanges: boolean;
}
