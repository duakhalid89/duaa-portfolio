import { useEffect, useRef, useState } from 'react'
import { doMove, sfx } from '../../lib/fx'

// "Skill Stack": a block labelled with one of Duaa's skills slides back and forth; tap (or press space) to drop it.
// Whatever overhangs the block below is cut off, so the tower narrows until a block misses completely.
const W = 640, H = 400, BH = 34
const SKILLS = ['Unity', 'C#', 'Unreal', 'C++', 'Blender', 'Three.js', 'VR', 'Level Design', 'Multiplayer', 'Node.js', 'React', 'Python', 'Animation', 'Git']
const COLORS = ['#a78bfa', '#ec4899', '#60a5fa', '#f0abfc', '#34d399', '#fbbf24', '#f472b6', '#22d3ee']
const best0 = () => { try { return +localStorage.getItem('stack-best') || 0 } catch { return 0 } }

export default function SkillStack() {
  const canvas = useRef()
  const [state, setState] = useState('ready') // ready | play | over
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(best0)

  useEffect(() => {
    if (state !== 'play') return
    const c = canvas.current
    const g = c.getContext('2d')
    // the base is skill 0; each placed block records x, width and its label
    const s = { blocks: [{ x: W / 2 - 110, w: 220, label: 'Duaa', color: '#8b5cf6' }], mover: null, dir: 1, speed: 190, cam: 0, chips: [], last: performance.now(), perfect: 0 }
    const next = () => {
      const top = s.blocks[s.blocks.length - 1], n = s.blocks.length
      s.mover = { x: s.dir > 0 ? -top.w : W, w: top.w, label: SKILLS[(n - 1) % SKILLS.length], color: COLORS[n % COLORS.length] }
      s.speed = Math.min(420, 190 + n * 12)
    }
    next()
    let raf, over = false

    const drop = () => {
      if (over) return
      const top = s.blocks[s.blocks.length - 1], m = s.mover
      const left = Math.max(top.x, m.x), right = Math.min(top.x + top.w, m.x + m.w)
      if (right - left <= 0) { // missed completely
        over = true
        s.chips.push({ ...m, y: s.blocks.length, vy: 0 })
        sfx('hit')
        setTimeout(() => {
          setState('over')
          const placed = s.blocks.length - 1
          setBest((b) => { const nb = Math.max(b, placed); try { localStorage.setItem('stack-best', String(nb)) } catch { /* ignore */ } return nb })
          doMove(placed >= 8 ? 'Victory' : 'Shrug')
        }, 700)
        return
      }
      let x = left, w = right - left
      if (Math.abs(m.x - top.x) < 6) { x = top.x; w = top.w; s.perfect = 0.6; sfx('success') } // perfect drop keeps full width
      else {
        sfx('coin')
        // the overhanging piece falls away
        const cut = m.x < top.x ? { x: m.x, w: top.x - m.x } : { x: top.x + top.w, w: m.x + m.w - (top.x + top.w) }
        s.chips.push({ ...m, ...cut, y: s.blocks.length, vy: 0 })
      }
      s.blocks.push({ x, w, label: m.label, color: m.color })
      setScore(s.blocks.length - 1)
      s.dir *= -1
      next()
    }
    const key = (e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); drop() } }
    c.addEventListener('pointerdown', drop)
    window.addEventListener('keydown', key)

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - s.last) / 1000)
      s.last = now
      if (!over) {
        s.mover.x += s.dir * s.speed * dt
        if (s.mover.x > W) s.dir = -1
        if (s.mover.x + s.mover.w < 0) s.dir = 1
      }
      // keep the top of the tower in view
      const targetCam = Math.max(0, (s.blocks.length - 7) * BH)
      s.cam += (targetCam - s.cam) * Math.min(1, dt * 5)
      s.perfect = Math.max(0, s.perfect - dt)
      s.chips.forEach((ch) => { ch.vy += 900 * dt; ch.fall = (ch.fall || 0) + ch.vy * dt })
      s.chips = s.chips.filter((ch) => ch.fall < H + 200)
      draw()
    }
    const yOf = (row) => H - 30 - (row + 1) * BH + s.cam
    const block = (b, y, alpha = 1) => {
      g.globalAlpha = alpha
      g.fillStyle = b.color
      g.shadowColor = b.color; g.shadowBlur = 12
      g.beginPath(); g.roundRect(b.x, y, b.w, BH - 4, 6); g.fill()
      g.shadowBlur = 0
      if (b.w > 34) {
        g.fillStyle = '#140a24'
        g.font = 'bold 14px "Space Grotesk", sans-serif'
        g.textAlign = 'center'; g.textBaseline = 'middle'
        g.fillText(b.label, b.x + b.w / 2, y + (BH - 4) / 2 + 1, b.w - 10)
      }
      g.globalAlpha = 1
    }
    const draw = () => {
      g.clearRect(0, 0, W, H)
      g.strokeStyle = 'rgba(139,92,246,0.15)'; g.lineWidth = 1
      for (let x = 0; x <= W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke() }
      g.fillStyle = 'rgba(139,92,246,0.25)'; g.fillRect(0, H - 30 + s.cam, W, 30)
      s.blocks.forEach((b, i) => block(b, yOf(i)))
      s.chips.forEach((ch) => block(ch, yOf(ch.y) + ch.fall, 0.6))
      if (!over) block(s.mover, yOf(s.blocks.length))
      if (s.perfect > 0) {
        g.fillStyle = `rgba(253,230,138,${s.perfect / 0.6})`
        g.font = 'bold 22px "Space Grotesk", sans-serif'; g.textAlign = 'center'
        g.fillText('PERFECT!', W / 2, 60)
      }
      g.fillStyle = '#f5f3ff'; g.font = 'bold 16px "JetBrains Mono", monospace'; g.textAlign = 'left'
      g.fillText(`HEIGHT ${s.blocks.length - 1}`, 14, 24)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); c.removeEventListener('pointerdown', drop); window.removeEventListener('keydown', key) }
  }, [state])

  const start = () => { setScore(0); setState('play') }
  return (
    <div className="arcade-game">
      <p className="game-intro">Stack my skills as high as you can. Click, tap or press space to drop each block.</p>
      <div className="game">
        <canvas ref={canvas} width={W} height={H} aria-label="Skill Stack game" />
        {state !== 'play' && (
          <div className="game-over">
            {state === 'over' && <div className="game-score">Tower height {score}{score >= best && score > 0 ? ' · New best!' : ''}</div>}
            <div className="game-best">Best: {best}</div>
            <button className="btn primary" onClick={start}>{state === 'ready' ? '▶ Play' : '↻ Play again'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
