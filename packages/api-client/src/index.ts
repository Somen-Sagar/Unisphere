import type {
  ApiErrorBody,
  AuthSession,
  CampusClub,
  CampusClubDetails,
  CampusEvent,
  CampusUser,
  CollegeSummary,
  EventRegistration,
  PaginatedResponse,
} from '@unisphere/types';

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class UniSphereApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'UniSphereApiError';
  }
}

export type UniSphereApiOptions = {
  baseUrl: string;
  authBaseUrl?: string;
  getAccessToken?: () => Promise<string | null>;
  getActiveCollegeId?: () => string | null;
  onUnauthorized?: () => Promise<string | null>;
  fetchImplementation?: FetchLike;
  credentials?: RequestCredentials;
};

export type HealthStatus = 'checking' | 'connected' | 'degraded' | 'offline';

export type UniSphereHealth = {
  service: string;
  status: string;
  database?: string;
  redis?: string;
  timestamp: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'STUDENT' | 'FACULTY' | 'COLLEGE_ADMIN';
  termsAccepted: true;
  college:
    | {
        mode: 'join';
        collegeId: string;
        studentId?: string;
      }
    | {
        mode: 'create';
        name: string;
        website?: string;
        emailDomain: string;
        city: string;
        state: string;
      };
};

export class UniSphereApi {
  private readonly fetchImplementation: FetchLike;

  constructor(private readonly options: UniSphereApiOptions) {
    const fetchImplementation = options.fetchImplementation;
    this.fetchImplementation = fetchImplementation
      ? (input, init) => fetchImplementation.call(globalThis, input, init)
      : (input, init) => globalThis.fetch(input, init);
  }

  async request<T>(endpoint: string, init: RequestInit = {}, retry = true): Promise<T> {
    return this.requestFrom<T>(this.options.baseUrl, endpoint, init, retry);
  }

  async authRequest<T>(endpoint: string, init: RequestInit = {}, retry = true): Promise<T> {
    const authBaseUrl =
      this.options.authBaseUrl ??
      `${this.options.baseUrl.replace(/\/$/, '')}/auth`;
    return this.requestFrom<T>(
      authBaseUrl,
      endpoint,
      init,
      retry,
    );
  }

  private async requestFrom<T>(
    baseUrl: string,
    endpoint: string,
    init: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const token = await this.options.getAccessToken?.();
    const activeCollegeId = this.options.getActiveCollegeId?.();
    const response = await this.fetchImplementation(
      `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`,
      {
        ...init,
        credentials: init.credentials ?? this.options.credentials,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(activeCollegeId ? { 'X-College-Id': activeCollegeId } : {}),
          ...init.headers,
        },
      },
    );

    if (response.status === 401 && retry && this.options.onUnauthorized) {
      const refreshedToken = await this.options.onUnauthorized();
      if (refreshedToken) return this.requestFrom<T>(baseUrl, endpoint, init, false);
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as ApiErrorBody | undefined;
      const rawMessage = body?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : rawMessage ?? `Request failed with status ${response.status}.`;
      throw new UniSphereApiError(message, response.status, body);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  login(input: { email: string; password: string }): Promise<AuthSession> {
    return this.authRequest('login', { method: 'POST', body: JSON.stringify(input) });
  }

  register(input: RegisterPayload): Promise<AuthSession> {
    return this.authRequest('register', { method: 'POST', body: JSON.stringify(input) });
  }

  refresh(refreshToken: string): Promise<AuthSession> {
    return this.authRequest(
      'refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      false,
    );
  }

  logout(refreshToken?: string): Promise<void | { ok: true }> {
    return this.authRequest('logout', {
      method: 'POST',
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
    });
  }

  me(): Promise<CampusUser> {
    return this.authRequest('me');
  }

  session(): Promise<{ user: CampusUser }> {
    return this.authRequest('session');
  }

  health(): Promise<UniSphereHealth> {
    return this.request('health');
  }

  colleges(): Promise<CollegeSummary[]> {
    return this.request('colleges');
  }

  clubs(): Promise<CampusClub[]> {
    return this.request('clubs');
  }

  club(clubId: string): Promise<CampusClubDetails> {
    return this.request(`clubs/${clubId}`);
  }

  events(params: Record<string, string | number | boolean | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    return this.request<PaginatedResponse<CampusEvent>>(`events?${query.toString()}`);
  }

  event(eventId: string): Promise<CampusEvent> {
    return this.request(`events/${eventId}`);
  }

  registerForEvent(eventId: string): Promise<EventRegistration> {
    return this.request(`events/${eventId}/registrations`, { method: 'POST' });
  }

  myRegistrations(): Promise<EventRegistration[]> {
    return this.request('registrations/me');
  }

  scanAttendance(qrToken: string): Promise<EventRegistration> {
    return this.request('attendance/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  }
}
