// Shared RAG helpers: tokenizing, local hashed vectors, optional embedding APIs, and cosine search.
export const DIM = 768

const STOP = new Set('a an and are as at be by for from has have i in is it its of on or that the this to was were will with you your my me about what which who how do does did can she her he his where when tell know has any'.split(' '))

export function tokenize(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w))
  const stem = words.map((w) => w.replace(/(ing|ed|es|s)$/, '').replace(/\.+$/, '') || w)
  const grams = []
  for (let i = 0; i < stem.length - 1; i++) grams.push(`${stem[i]}_${stem[i + 1]}`)
  return [...stem, ...grams]
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Local embedding: hashing-trick bag of words/bigrams with IDF weights, L2-normalised.
export function localEmbed(text, idf = {}) {
  const v = new Array(DIM).fill(0)
  const counts = {}
  for (const t of tokenize(text)) counts[t] = (counts[t] || 0) + 1
  for (const [t, c] of Object.entries(counts)) {
    const h = hash(t)
    v[h % DIM] += (h & 0x80000000 ? -1 : 1) * (1 + Math.log(c)) * (idf[t] ?? 1)
  }
  return normalize(v)
}

export function normalize(v) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / n)
}

export const cosine = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0)

// Remote providers are optional; the index records which one built it so queries match.
export async function remoteEmbed(provider, key, texts, kind = 'document') {
  if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
    })
    if (!r.ok) throw new Error(`OpenAI embeddings failed: ${r.status}`)
    return (await r.json()).data.map((d) => d.embedding)
  }
  if (provider === 'voyage') {
    const r = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'voyage-3.5-lite', input: texts, input_type: kind }),
    })
    if (!r.ok) throw new Error(`Voyage embeddings failed: ${r.status}`)
    return (await r.json()).data.map((d) => d.embedding)
  }
  if (provider === 'gemini') {
    // One batch call; 768 dimensions keeps the shipped index small (vectors are re-normalised afterwards).
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        requests: texts.map((t) => ({
          model: 'models/gemini-embedding-001', content: { parts: [{ text: t }] },
          taskType: kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT', outputDimensionality: 768,
        })),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) throw new Error(`Gemini embeddings failed: ${r.status} ${(await r.text()).slice(0, 200)}`)
    return (await r.json()).embeddings.map((e) => e.values)
  }
  throw new Error(`Unknown embeddings provider: ${provider}`)
}

// A Gemini key doubles as the embeddings key, so one free key runs the whole chatbot.
export const embeddingsKey = (provider) => process.env.EMBEDDINGS_API_KEY || (provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined)

export async function embedQuery(index, query) {
  if (index.provider === 'local') return localEmbed(query, index.idf)
  return normalize((await remoteEmbed(index.provider, embeddingsKey(index.provider), [query], 'query'))[0])
}

// Keyword fallback (TF-IDF overlap) for when the embeddings API is unavailable, e.g. the free daily quota ran out:
// the chatbot keeps answering from the same chunks, just with simpler matching.
function keywordRetrieve(index, query, k) {
  const df = {}
  const docs = index.chunks.map((c) => new Set(tokenize(c.text)))
  docs.forEach((d) => d.forEach((t) => { df[t] = (df[t] || 0) + 1 }))
  const q = [...new Set(tokenize(query))]
  return index.chunks
    .map((c, i) => ({ c, score: q.reduce((s, t) => s + (docs[i].has(t) ? Math.log(1 + index.chunks.length / df[t]) : 0), 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => ({ ...s.c, score: +s.score.toFixed(3) }))
}

export async function retrieve(index, query, k = 5) {
  let q
  try {
    q = await embedQuery(index, query)
  } catch (err) {
    console.warn('embeddings unavailable, using keyword search:', err.message.slice(0, 120))
    return keywordRetrieve(index, query, k)
  }
  const scored = index.chunks.map((c) => ({ c, score: cosine(q, c.vector) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k).filter((s) => s.score > 0.05).map((s) => ({ ...s.c, score: +s.score.toFixed(3) }))
}
