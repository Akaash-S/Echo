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
  title?: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  token: string;
}

export interface StartSessionResponse {
  sessionId: string;
  openingMessage: string;
  previousTheme: string | null;
  startedAt: string;
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
