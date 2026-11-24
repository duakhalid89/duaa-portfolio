// Builds api/_data/index.json: load documents -> chunk -> embed -> store vectors.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { profile, skills, education, experience, achievements, community, certifications } from '../src/data/profile.js'
import { projects, hubs } from '../src/data/projects.js'
import { tokenize, localEmbed, remoteEmbed, normalize, embeddingsKey } from '../api/_lib/rag.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Load .env without a dependency (only for local builds; Vercel injects env vars itself).
if (existsSync(join(root, '.env'))) {
  for (const line of readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

// 1. Collect documents, each tagged with a section so answers can cite the page.
const docs = []
const add = (source, section, anchor, text) => docs.push({ source, section, anchor, text: text.trim() })

add('Profile', 'About', '#about', `${profile.name} — ${profile.role}. Based in ${profile.location}. ${profile.tagline} ${profile.hook}\n${profile.bio.join('\n')}`)
add('Profile', 'Contact', '#contact', `Contact ${profile.name}: email ${profile.email}, LinkedIn ${profile.links.linkedin}, GitHub ${profile.links.github}, location ${profile.location}. A contact form is on the website.`)
for (const s of skills) add('Skills', 'Skills', '#skills', `${s.group}: ${s.items.join(', ')}`)
for (const e of education) add('Education', 'Education', '#journey', `${e.title}, ${e.where} (${e.when}). ${e.detail}`)
for (const e of experience) add('Experience', 'Experience', '#journey', `${e.title} at ${e.where} (${e.when}). ${e.detail}`)
for (const a of achievements) add('Achievements', 'Achievements', '#projects', `${a.title}. ${a.detail}`)
add('Community', 'Experience', '#journey', `Societies and volunteering: ${community.join('; ')}.`)
add('Certifications', 'Experience', '#journey', `Certifications: ${certifications.join('; ')}.`)
for (const p of projects) {
  const hubNames = p.hubs.map((id) => hubs.find((h) => h.id === id)?.label).join(', ')
  add(`Project: ${p.title}`, 'Projects', '#projects', `${p.title} (${p.year}${p.badge ? `, ${p.badge}` : ''}) — ${p.summary} ${p.detail} Tech: ${p.stack.join(', ')}. Role: ${p.role}. Category: ${hubNames}.`)
}

const kdir = join(root, 'knowledge')
for (const f of readdirSync(kdir)) {
  if (!/\.(txt|md)$/.test(f)) continue
  const text = readFileSync(join(kdir, f), 'utf8').split('\n').filter((l) => !/\+92\s?\d/.test(l)).join('\n') // keep phone number private
  const label = f.replace(/\.(txt|md)$/, '').replace(/^cv-/, '').split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
  add(`${label} CV`, 'CV', '#about', text) // cv-game-developer.txt -> "Game Developer CV"
}

// 2. Chunk: split on blank lines, merge to ~700 chars with ~100 char overlap.
const chunks = []
for (const d of docs) {
  const paras = d.text.split(/\n\s*\n/).map((p) => p.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
  let buf = ''
  const flush = () => { if (buf.trim().length > 20) chunks.push({ source: d.source, section: d.section, anchor: d.anchor, text: buf.trim() }); }
  for (const p of paras) {
    if ((buf + p).length > 700 && buf) { flush(); buf = buf.slice(-100) + '\n' + p } else buf += (buf ? '\n' : '') + p
  }
  flush()
}

// 3. Embed.
const provider = process.env.EMBEDDINGS_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'local')
let idf
if (provider === 'local') {
  const df = {}
  for (const c of chunks) for (const t of new Set(tokenize(c.text))) df[t] = (df[t] || 0) + 1
  idf = Object.fromEntries(Object.entries(df).map(([t, n]) => [t, Math.log(1 + chunks.length / n)]))
  chunks.forEach((c) => { c.vector = localEmbed(c.text, idf).map((x) => +x.toFixed(5)) })
} else {
  // Reuse vectors from the existing index for chunks whose text is unchanged, so routine builds (and every Vercel
  // deploy) don't spend embedding quota; only new or edited chunks are sent to the API.
  let cached = new Map()
  try {
    const old = JSON.parse(readFileSync(join(root, 'api/_data/index.json'), 'utf8'))
    if (old.provider === provider) cached = new Map(old.chunks.map((c) => [c.text, c.vector]))
  } catch { /* first build */ }
  chunks.forEach((c) => { if (cached.has(c.text)) c.vector = cached.get(c.text) })
  const todo = chunks.filter((c) => !c.vector)
  for (let i = 0; i < todo.length; i += 32) {
    const batch = todo.slice(i, i + 32)
    const vecs = await remoteEmbed(provider, embeddingsKey(provider), batch.map((c) => c.text))
    batch.forEach((c, j) => { c.vector = normalize(vecs[j]).map((x) => +x.toFixed(5)) })
  }
  console.log(`embedded ${todo.length} new/changed chunks, reused ${chunks.length - todo.length}`)
}

// 4. Store.
mkdirSync(join(root, 'api/_data'), { recursive: true })
writeFileSync(join(root, 'api/_data/index.json'), JSON.stringify({ provider, idf, built: new Date().toISOString(), chunks }))
console.log(`RAG index built: ${docs.length} documents -> ${chunks.length} chunks (provider: ${provider})`)
