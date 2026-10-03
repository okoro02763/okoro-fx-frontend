export const TOKEN_KEY = 'okoro_token';
export const USER_KEY = 'okoro_user';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
