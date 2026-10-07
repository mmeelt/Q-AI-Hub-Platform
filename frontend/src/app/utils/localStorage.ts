// Session helpers.
// The JWT access/refresh tokens live in HttpOnly cookies set by the API: JavaScript never sees them.
// localStorage only keeps non-sensitive profile info used to render the UI (name, role, email).

export const localStorageKeys = {
  isLoggedIn: 'isLoggedIn',
  userName: 'userName',
  userEmail: 'userEmail',
  userRole: 'userRole',
  userId: 'userId',
} as const;

// Tokens stored by older versions of the app: removed on logout / next login
const LEGACY_TOKEN_KEYS = ['token', 'refreshToken'];

export const getUserName = (fallback: string = 'User'): string => {
  return localStorage.getItem(localStorageKeys.userName) || fallback;
};

export const getUserEmail = (fallback: string = ''): string => {
  return localStorage.getItem(localStorageKeys.userEmail) || fallback;
};

export const getUserRole = (fallback: string = 'user'): string => {
  return localStorage.getItem(localStorageKeys.userRole) || fallback;
};

export const getUserId = (fallback: string = ''): string => {
  return localStorage.getItem(localStorageKeys.userId) || fallback;
};

/** True once the user has completed OTP login (the session itself is the HttpOnly cookie). */
export const isLoggedIn = (): boolean => {
  return localStorage.getItem(localStorageKeys.isLoggedIn) === 'true';
};

export const setUserName = (name: string): void => {
  localStorage.setItem(localStorageKeys.userName, name);
};

export const saveSession = (user: { email?: string; role?: string; fullName?: string; userId?: string }): void => {
  LEGACY_TOKEN_KEYS.forEach(k => localStorage.removeItem(k));
  localStorage.setItem(localStorageKeys.isLoggedIn, 'true');
  localStorage.setItem(localStorageKeys.userEmail, user.email || '');
  localStorage.setItem(localStorageKeys.userRole, (user.role || 'USER').replace(/^ROLE_/i, '').toUpperCase());
  localStorage.setItem(localStorageKeys.userName, user.fullName || '');
  if (user.userId) localStorage.setItem(localStorageKeys.userId, user.userId);
};

export const clearAuth = (): void => {
  [...Object.values(localStorageKeys), ...LEGACY_TOKEN_KEYS].forEach(key => localStorage.removeItem(key));
  sessionStorage.removeItem('hasExpertRoles');
};
