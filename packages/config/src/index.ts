export const defaultApiVersion = 'v1';

export const tenantHeaderName = 'X-College-Id';

export const publicRoutes = {
  health: '/api/v1/health',
  login: '/login',
  register: '/register',
} as const;

export const defaultCurrency = 'INR';
