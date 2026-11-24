import { existsSync, readFileSync } from 'node:fs'
import { retrieve } from '../api/_lib/rag.js'
// Load .env so a Gemini-built index can embed the test questions too.
if (existsSync('.env')) for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/); if (m) process.env[m[1]] ??= m[2] }
const index = JSON.parse(readFileSync('api/_data/index.json', 'utf8'))
for (const q of ['Tell me about Unbroken Oath', 'Where did she intern?', 'What is her CGPA?', 'Does she know Rust or have a pet cat?']) {
  const hits = await retrieve(index, q, 3)
  console.log(`\nQ: ${q}`)
  hits.forEach((h) => console.log(`  ${h.score}  ${h.source}: ${h.text.slice(0, 70).replace(/\n/g, ' ')}`))
}
