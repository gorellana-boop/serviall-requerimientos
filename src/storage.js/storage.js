const API = '/api/kv';

export async function getItem(key) {
  try {
    const res = await fetch(`${API}?key=${encodeURIComponent(key)}`);
    const data = await res.json();
    return data.value ?? null;
  } catch {
    return null;
  }
}

export async function setItem(key, value) {
  try {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
  } catch {}
}
