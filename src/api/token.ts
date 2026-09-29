export const TOKEN_KEY = 'fxpilot_token';
export const USER_KEY = 'fxpilot_user';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
