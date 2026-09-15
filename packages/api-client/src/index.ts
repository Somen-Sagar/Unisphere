import type {
  ApiErrorBody,
  AuthSession,
  CampusClub,
  CampusClubDetails,
  CampusEvent,
  CampusNotification,
  CampusUser,
  CollegeDetails,
  CollegeSummary,
  DashboardSummary,
  Department,
  EventRegistration,
  Membership,
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
      department?: string;
      studentId?: string;
    }
    | {
        mode: 'create';
        name: string;
        slug?: string;
        website?: string;
        officialEmailDomain: string;
        emailDomain?: string;
        city: string;
        state: string;
        country?: string;
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

  college(slug: string): Promise<CollegeDetails> {
    return this.request(`colleges/${slug}`);
  }

  createCollege(input: Record<string, unknown>): Promise<CollegeDetails> {
    return this.request('colleges', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateCollege(
    collegeId: string,
    input: Record<string, unknown>,
  ): Promise<CollegeDetails> {
    return this.request(`colleges/${collegeId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  collegeMembers(collegeId: string): Promise<Membership[]> {
    return this.request(`colleges/${collegeId}/members`);
  }

  departments(): Promise<Department[]> {
    return this.request('departments');
  }

  createDepartment(input: Record<string, unknown>): Promise<Department> {
    return this.request('departments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  clubs(): Promise<CampusClub[]> {
    return this.request('clubs');
  }

  club(clubId: string): Promise<CampusClubDetails> {
    return this.request(`clubs/${clubId}`);
  }

  createClub(input: Record<string, unknown>): Promise<CampusClub> {
    return this.request('clubs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateClub(clubId: string, input: Record<string, unknown>): Promise<CampusClub> {
    return this.request(`clubs/${clubId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
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

  createEvent(input: Record<string, unknown>): Promise<CampusEvent> {
    return this.request('events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateEvent(eventId: string, input: Record<string, unknown>): Promise<CampusEvent> {
    return this.request(`events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  publishEvent(eventId: string): Promise<CampusEvent> {
    return this.request(`events/${eventId}/publish`, { method: 'POST' });
  }

  registerForEvent(eventId: string): Promise<EventRegistration> {
    return this.request(`events/${eventId}/register`, { method: 'POST' });
  }

  cancelEventRegistration(eventId: string): Promise<EventRegistration> {
    return this.request(`events/${eventId}/register`, { method: 'DELETE' });
  }

  eventRegistrations(eventId: string): Promise<EventRegistration[]> {
    return this.request(`events/${eventId}/registrations`);
  }

  myRegistrations(): Promise<EventRegistration[]> {
    return this.request('registrations/me');
  }

  dashboardSummary(): Promise<DashboardSummary> {
    return this.request('dashboard/summary');
  }

  notifications(): Promise<CampusNotification[]> {
    return this.request('notifications');
  }

  markNotificationRead(notificationId: string): Promise<CampusNotification> {
    return this.request(`notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  scanAttendance(qrToken: string): Promise<EventRegistration> {
    return this.request('attendance/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  }
}
