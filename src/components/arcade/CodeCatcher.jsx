import { useEffect, useRef, useState } from 'react'
import { doMove, sfx } from '../../lib/fx'
import { unlock } from '../../lib/achievements'

// "Code Catcher": catch falling tech icons with the controller, dodge the bugs. Three lives, speeds up as you score.
const W = 640, H = 400
const GOOD = [
  { label: 'C#', color: '#a78bfa', pts: 10 },
  { label: 'C++', color: '#60a5fa', pts: 10 },
  { label: 'U', color: '#f0abfc', pts: 10 },   // Unity
  { label: 'UE', color: '#f9a8d4', pts: 10 },  // Unreal Engine
  { label: 'JS', color: '#86efac', pts: 10 },
]
const best0 = () => { try { return +localStorage.getItem('codecatcher-best') || 0 } catch { return 0 } }

export default function CodeCatcher() {
  const canvas = useRef()
  const [state, setState] = useState('ready') // ready | play | over
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(best0)

  useEffect(() => {
    if (state !== 'play') return
    const c = canvas.current
    const g = c.getContext('2d')
    const s = { x: W / 2, keys: {}, items: [], lives: 3, score: 0, t: 0, spawn: 0, last: performance.now(), flash: 0, pops: [] }
    let raf, visible = true

    const toCanvasX = (clientX) => { const r = c.getBoundingClientRect(); return ((clientX - r.left) / r.width) * W }
    const move = (e) => { s.x = toCanvasX(e.touches ? e.touches[0].clientX : e.clientX) }
    const key = (down) => (e) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { s.keys[e.key] = down; e.preventDefault() }
    }
    const kd = key(true), ku = key(false)
    c.addEventListener('pointermove', move)
    c.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; s.last = performance.now() })
    io.observe(c)

    const end = () => {
      setState('over')
      if (s.score >= 100) unlock('gamer')
      sfx('hit')
      setBest((b) => {
        const nb = Math.max(b, s.score)
        try { localStorage.setItem('codecatcher-best', String(nb)) } catch { /* ignore */ }
        if (s.score > b && s.score > 0) { doMove('Victory'); setTimeout(() => sfx('success'), 300) }
        return nb
      })
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const dt = Math.min(0.05, (now - s.last) / 1000)
      s.last = now
      s.t += dt
      const speed = 1 + s.score / 300
      // input
      if (s.keys.ArrowLeft || s.keys.a) s.x -= 420 * dt
      if (s.keys.ArrowRight || s.keys.d) s.x += 420 * dt
      s.x = Math.max(40, Math.min(W - 40, s.x))
      // spawn
      s.spawn -= dt
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.32, 0.9 - s.score / 900)
        const r = Math.random()
        const kind = r < 0.27 ? 'bug' : r < 0.31 ? 'star' : 'good'
        s.items.push({ kind, x: 30 + Math.random() * (W - 60), y: -20, vy: (110 + Math.random() * 80) * speed, spin: Math.random() * 6, ...(kind === 'good' ? GOOD[(Math.random() * GOOD.length) | 0] : {}) })
      }
      // update + collide with the controller
      for (const it of s.items) {
        it.y += it.vy * dt
        it.spin += dt * 3
        if (!it.done && it.y > H - 62 && it.y < H - 22 && Math.abs(it.x - s.x) < 52) {
          it.done = true
          if (it.kind === 'bug') { s.lives--; s.flash = 0.35; sfx('hit'); if (s.lives <= 0) { s.score = Math.max(0, s.score); cancelAnimationFrame(raf); end(); draw(); return } }
          else { const p = it.kind === 'star' ? 50 : it.pts; s.score += p; s.pops.push({ x: it.x, y: it.y, txt: `+${p}`, t: 0.7 }); sfx(it.kind === 'star' ? 'success' : 'coin'); setScore(s.score) }
        }
      }
      s.items = s.items.filter((it) => !it.done && it.y < H + 30)
      s.pops = s.pops.filter((p) => (p.t -= dt) > 0)
      s.flash = Math.max(0, s.flash - dt)
      draw()
    }

    const draw = () => {
      g.clearRect(0, 0, W, H)
      // backdrop grid
      g.fillStyle = s.flash > 0 ? `rgba(236,72,153,${s.flash})` : 'rgba(0,0,0,0)'
      g.fillRect(0, 0, W, H)
      g.strokeStyle = 'rgba(139,92,246,0.15)'
      g.lineWidth = 1
      for (let x = 0; x <= W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke() }
      for (let y = (s.t * 30) % 40; y <= H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
      // items
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      for (const it of s.items) {
        if (it.kind === 'good') {
          g.shadowColor = it.color; g.shadowBlur = 14
          g.fillStyle = '#1a0f2e'; g.strokeStyle = it.color; g.lineWidth = 3
          g.beginPath(); g.arc(it.x, it.y, 20, 0, Math.PI * 2); g.fill(); g.stroke()
          g.shadowBlur = 0
          g.fillStyle = it.color; g.font = 'bold 14px "Space Grotesk", sans-serif'; g.fillText(it.label, it.x, it.y + 1)
        } else {
          g.save(); g.translate(it.x, it.y); g.rotate(Math.sin(it.spin) * 0.4)
          g.font = it.kind === 'star' ? '30px serif' : '28px serif'
          g.fillText(it.kind === 'star' ? '⭐' : '🐞', 0, 0)
          g.restore()
        }
      }
      // controller
      g.font = '44px serif'
      g.fillText('🎮', s.x, H - 40)
      // floating points
      g.font = 'bold 16px "JetBrains Mono", monospace'
      for (const p of s.pops) { g.fillStyle = `rgba(240,171,252,${p.t / 0.7})`; g.fillText(p.txt, p.x, p.y - (0.7 - p.t) * 50) }
      // HUD
      g.textAlign = 'left'; g.fillStyle = '#f5f3ff'; g.font = 'bold 16px "JetBrains Mono", monospace'
      g.fillText(`SCORE ${s.score}`, 14, 22)
      g.textAlign = 'right'; g.fillText('💜'.repeat(Math.max(0, s.lives)), W - 14, 22)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      c.removeEventListener('pointermove', move)
      c.removeEventListener('touchmove', move)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [state])

  const start = () => { setScore(0); setState('play') }

  return (
    <div className="arcade-game">
      <p className="game-intro">Catch the tech icons, dodge the bugs. Mouse, touch or ← → keys.</p>
      <div className="game">
        <canvas ref={canvas} width={W} height={H} aria-label="Code Catcher game" />
        {state !== 'play' && (
          <div className="game-over">
            {state === 'over' && <div className="game-score">Score {score}{score >= best && score > 0 ? ' · New best!' : ''}</div>}
            <div className="game-best">Best: {best}</div>
            <button className="btn primary" onClick={start}>{state === 'ready' ? '▶ Play' : '↻ Play again'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
