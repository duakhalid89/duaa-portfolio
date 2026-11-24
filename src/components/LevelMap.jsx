import { useEffect, useMemo, useState } from 'react'
import { hubs, projects } from '../data/projects'

// Projects as a game level-select map: a winding path through "worlds" (one per primary engine), each project a
// level node. Opened projects are marked cleared (★★★), remembered in this browser.
const WORLDS = [
  { id: 'unity', name: 'Unity Isles', match: (p) => p.hubs[0] === 'unity' },
  { id: 'unreal', name: 'Unreal Peaks', match: (p) => p.hubs[0] === 'unreal' },
  { id: 'node', name: 'Web Nebula', match: (p) => ['node', 'three'].includes(p.hubs[0]) },
  { id: 'cpp', name: 'C++ Caverns', match: (p) => p.hubs[0] === 'cpp' },
]
const XS = [18, 50, 82, 50] // zig-zag columns (% of width)
const ROW = 118, HEADER = 70

const loadCleared = () => { try { return new Set(JSON.parse(localStorage.getItem('cleared') || '[]')) } catch { return new Set() } }

export default function LevelMap({ visible, onOpen }) {
  const [cleared, setCleared] = useState(loadCleared)
  useEffect(() => {
    const f = () => setCleared(loadCleared())
    window.addEventListener('cleared', f)
    return () => window.removeEventListener('cleared', f)
  }, [])

  // lay the worlds out top to bottom, levels zig-zagging inside each one
  const { nodes, banners, height } = useMemo(() => {
    const nodes = [], banners = []
    let y = 10, k = 0
    WORLDS.forEach((w, wi) => {
      const list = projects.filter(w.match)
      if (!list.length) return
      banners.push({ ...w, n: wi + 1, y, color: hubs.find((h) => h.id === w.id)?.color })
      y += HEADER
      list.forEach((p, i) => {
        nodes.push({ p, x: XS[k++ % XS.length], y: y + 40, label: `${wi + 1}-${i + 1}`, hub: p.hubs[0] })
        y += ROW
      })
    })
    return { nodes, banners, height: y + 20 }
  }, [])

  // smooth path through every node
  const d = nodes.map((n, i) => {
    if (!i) return `M ${n.x} ${n.y}`
    const a = nodes[i - 1], my = (a.y + n.y) / 2
    return `C ${a.x} ${my}, ${n.x} ${my}, ${n.x} ${n.y}`
  }).join(' ')

  const open = (n) => {
    const next = new Set(cleared).add(n.p.id)
    try { localStorage.setItem('cleared', JSON.stringify([...next])) } catch { /* ignore */ }
    setCleared(next)
    onOpen(n.hub, n.p.id)
  }

  return (
    <div className="lvmap" style={{ height }}>
      <svg className="lvmap-path" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={d} className="road" vectorEffect="non-scaling-stroke" />
        <path d={d} className="dash" vectorEffect="non-scaling-stroke" />
      </svg>
      {banners.map((b) => (
        <div key={b.id} className="lvmap-world" style={{ top: b.y, '--c': b.color }}>
          <span>World {b.n}</span>{b.name}
        </div>
      ))}
      {nodes.map((n) => {
        const done = cleared.has(n.p.id)
        const dim = visible && !visible.has(n.p.id)
        return (
          <button
            key={n.p.id}
            className={`lvnode${done ? ' done' : ''}${dim ? ' dim' : ''}${n.p.badge ? ' boss' : ''}`}
            style={{ left: `${n.x}%`, top: n.y, '--c': hubs.find((h) => h.id === n.hub)?.color }}
            onClick={() => open(n)}
            aria-label={`Level ${n.label}: ${n.p.title}${done ? ' (cleared)' : ''}`}
          >
            <span className="lvnode-orb" style={n.p.video ? { backgroundImage: `url(/posters/${n.p.id}.jpg)` } : undefined}>
              {!n.p.video && <b>{n.label}</b>}
            </span>
            <span className="lvnode-tag">
              <small>{n.label}{n.p.badge ? ' · 👑' : ''}</small>
              {n.p.title}
              <i>{done ? '★★★' : '☆☆☆'}</i>
            </span>
            <span className="lvnode-tip">{n.p.summary}</span>
          </button>
        )
      })}
    </div>
  )
}
