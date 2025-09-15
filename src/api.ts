const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Error al iniciar sesión');
  }
  return res.json();
}

export async function me(token: string) {
  const res = await fetch(`${API_BASE}/api/auth/me/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('No autorizado');
  return res.json();
}
