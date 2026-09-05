export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface JournalMessage {
  id?: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface JournalSession {
  sessionId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  messages: JournalMessage[];
  summary: string | null;
  extractedTheme: string | null;
  followUpQuestion: string | null;
  followUpAsked: boolean;
  followUpReferencedNext: boolean;
  location?: LocationCoords | null;
  title?: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  token: string;
  role?: 'user' | 'admin';
}

export interface StartSessionResponse {
  sessionId: string;
  openingMessage: string;
  previousTheme: string | null;
  startedAt: string;
  location?: LocationCoords | null;
}

export interface MessageSessionResponse {
  reply: string;
  sessionId: string;
  messages: JournalMessage[];
}

export interface EndSessionResponse {
  summary: string;
  extractedTheme: string | null;
  followUpQuestion: string | null;
  sessionId: string;
  endedAt: string;
  followUpAsked: boolean;
}

export interface ReminderStatusResponse {
  daysSinceLastEntry: number;
  shouldRemind: boolean;
  hasPastSessions: boolean;
  lastDate: string | null;
}

export interface PlaceRetrospective {
  sessionCount: number;
  location: LocationCoords;
  dates: string[];
  themes: string[];
  retrospective: string;
}

export interface AdminMetrics {
  totalUsers: number;
  totalSessions: number;
  sessionsLast7Days: number;
  avgSessionsPerUser: number;
}
