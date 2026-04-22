import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'key requerido' });

  try {
    if (req.method === 'GET') {
      const value = await redis.get(key);
      return res.json({ value: value ?? null });
    }
    if (req.method === 'POST') {
      const { value } = req.body;
      if (value === null || value === undefined) {
        await redis.del(key);
      } else {
        await redis.set(key, value);
      }
      return res.json({ ok: true });
    }
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
