const TOKEN_KEY = 'timker_bidik_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function api(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/';
    throw new Error('Sesi berakhir, silakan login ulang');
  }
  return res;
}
