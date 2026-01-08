// services/authSilentRefresh.js
export async function trySilentRefresh({
  url = '/auth/refresh',
  timeoutMs = 5000,       // don't hang the app — choose reasonable timeout
  fetchOptions = {},
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'include', // crucial so HttpOnly cookie is sent
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...fetchOptions,
    });

    clearTimeout(timer);

    if (!resp.ok) {
      // 401 -> no session; 5xx -> server error
      return { ok: false, status: resp.status, body: null };
    }

    // Expect JSON like { accessToken, user? }
    const data = await resp.json();
    return { ok: true, status: resp.status, body: data };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { ok: false, error: new Error('Silent refresh timed out') };
    }
    return { ok: false, error: err };
  }
}
