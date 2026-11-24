// Best-effort in-memory rate limiter (per warm serverless instance) — enough for basic abuse protection.
const hits = new Map()

export function rateLimit(req, key, max, windowMs) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString().split(',')[0].trim()
  const id = `${key}:${ip}`
  const now = Date.now()
  const recent = (hits.get(id) || []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(id, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  return recent.length <= max
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 20000) throw new Error('Payload too large')
  }
  return JSON.parse(raw || '{}')
}
