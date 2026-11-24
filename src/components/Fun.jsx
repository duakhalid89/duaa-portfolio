import { useEffect, useState } from 'react'
import { ACHIEVEMENTS, onAchievement, unlock, unlocked } from '../lib/achievements'
import { doMove, say } from '../lib/fx'

// Trophy button for the nav: unlocked count, opens the achievements list.
export function TrophyButton() {
  const [got, setGot] = useState(unlocked)
  const [open, setOpen] = useState(false)
  useEffect(() => onAchievement(() => setGot(unlocked())), [])
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  return (
    <div className="trophy">
      <button className="icon-btn trophy-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Achievements: ${got.size} of ${ACHIEVEMENTS.length} unlocked`}>
        🏆<span>{got.size}/{ACHIEVEMENTS.length}</span>
      </button>
      {open && (
        <div className="trophy-panel glass" role="dialog" aria-label="Achievements">
          <b>Achievements</b>
          <ul>
            {ACHIEVEMENTS.map((a) => (
              <li key={a.id} className={got.has(a.id) ? 'got' : ''}>
                <span className="ach-icon">{got.has(a.id) ? a.icon : '🔒'}</span>
                <span><strong>{a.title}</strong><small>{a.desc}</small></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

// Achievement toasts + the secret cheat code + the "explorer" tracker.
export function FunLayer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => onAchievement((a, n) => {
    const id = Math.random()
    setToasts((t) => [...t, { ...a, key: id, n }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== id)), 4200)
  }), [])

  // ↑↑↓↓←→←→BA: she grabs her controller
  useEffect(() => {
    let i = 0
    const key = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      i = k === KONAMI[i] ? i + 1 : k === KONAMI[0] ? 1 : 0
      if (i < KONAMI.length) return
      i = 0

      
      doMove('Gamer')
      say('Cheat code activated! You found my secret.')
      unlock('cheater')
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // Explorer: every main section has been on screen
  useEffect(() => {
    const ids = ['about', 'reel', 'room', 'skills', 'projects', 'journey', 'contact']
    const seen = new Set()
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return
      seen.add(e.target.id)

      if (seen.size === ids.length) { unlock('explorer'); io.disconnect() }
    }), { rootMargin: '-40% 0px -40% 0px' })
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.key} className="toast">
          <span className="ach-icon">{t.icon}</span>
          <span><small>Achievement unlocked · {t.n}/{ACHIEVEMENTS.length}</small><strong>{t.title}</strong></span>
        </div>
      ))}
    </div>
  )
}
