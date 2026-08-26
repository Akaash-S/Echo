import { JournalSession, StartSessionResponse, MessageSessionResponse, EndSessionResponse } from '../types';

export class EchoApiClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.token}`);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errMessage = `HTTP error ${res.status}`;
      try {
        const errorJson = await res.json();
        errMessage = errorJson.error || errorJson.message || errMessage;
      } catch {
        // fallback to status text
      }
      throw new Error(errMessage);
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

  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    return this.fetchWithAuth<{ success: boolean }>(`/api/session/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getSecurityAudit(): Promise<any> {
    return this.fetchWithAuth<any>('/api/security/audit');
  }
}
