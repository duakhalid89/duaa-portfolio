// Local stand-in for Vercel functions: serves api/*.js on :3001 (Vite proxies /api here).
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// Re-read .env on every request so edited keys take effect without restarting the server.
function loadEnv() {
  if (!existsSync('.env')) return
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

createServer(async (req, res) => {
  loadEnv()
  const name = req.url.split('?')[0].replace(/^\/api\//, '')
  const file = resolve('api', `${name}.js`)
  if (!/^[a-z-]+$/.test(name) || !existsSync(file)) { res.writeHead(404); return res.end('{}') }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)) }
  try {
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
    await mod.default(req, res)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
}).listen(3001, () => console.log('API on http://localhost:3001'))
