import { JournalSession, StartSessionResponse, MessageSessionResponse, EndSessionResponse } from '../types';

export class EchoApiClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    const meta = import.meta as any;
    this.baseUrl = (meta && meta.env && meta.env.VITE_API_URL) || '';
  }

  setToken(token: string) {
    this.token = token;
  }

  private async fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.token}`);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!res.ok) {
      let errMessage = `HTTP error ${res.status}`;
      if (isJson) {
        try {
          const errorJson = await res.json();
          errMessage = errorJson.detail || errorJson.error || errorJson.message || errMessage;
        } catch {
          // fallback
        }
      }
      throw new Error(errMessage);
    }

    if (!isJson) {
      throw new Error(`Expected JSON response but received ${contentType || 'HTML'}`);
    }

    return res.json() as Promise<T>;
  }

  async startSession(): Promise<StartSessionResponse> {
    return this.fetchWithAuth<StartSessionResponse>('/api/session/start', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async sendMessage(sessionId: string, text: string): Promise<MessageSessionResponse> {
    return this.fetchWithAuth<MessageSessionResponse>('/api/session/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, text }),
    });
  }

  async endSession(sessionId: string): Promise<EndSessionResponse> {
    return this.fetchWithAuth<EndSessionResponse>('/api/session/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async listSessions(): Promise<{ sessions: JournalSession[] }> {
    return this.fetchWithAuth<{ sessions: JournalSession[] }>('/api/sessions');
  }

  async getSession(sessionId: string): Promise<{ session: JournalSession }> {
    return this.fetchWithAuth<{ session: JournalSession }>(`/api/session/${sessionId}`);
  }
}
