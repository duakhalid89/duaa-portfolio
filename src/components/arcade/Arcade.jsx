import { useEffect, useState } from 'react'
import { watchWindow } from '../../lib/fx'
import { unlock } from '../../lib/achievements'
import CodeCatcher from './CodeCatcher'
import GuessTheGame from './GuessTheGame'
import SkillStack from './SkillStack'

// Duaa's Games: one window, opened from the computer (or the controller) in the 3D room. A menu of three small
// games; each shows its saved best score.
const GAMES = [
  { id: 'catch', title: 'Code Catcher', icon: '🎮', blurb: 'Catch the tech icons, dodge the bugs.', key: 'codecatcher-best', unit: 'pts', Game: CodeCatcher },
  { id: 'guess', title: 'Guess the Game', icon: '🖼️', blurb: 'Name my game from a blurry screenshot.', key: 'guess-best', unit: 'pts', Game: GuessTheGame },
  { id: 'stack', title: 'Skill Stack', icon: '🧱', blurb: 'Stack my skills into the tallest tower.', key: 'stack-best', unit: 'blocks', Game: SkillStack },
]
const bestOf = (key) => { try { return +localStorage.getItem(key) || 0 } catch { return 0 } }

export default function Arcade() {
  const [open, setOpen] = useState(false)
  const [game, setGame] = useState(null)

  useEffect(() => watchWindow('game', () => { setOpen(true); setGame(null); unlock('arcade') }, () => setOpen(false)), [])
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const esc = (e) => { if (e.key === 'Escape') { if (game) setGame(null); else setOpen(false) } }
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc) }
  }, [open, game])

  if (!open) return null
  const current = GAMES.find((g) => g.id === game)
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Duaa's Games">
      <div className="overlay-card glass arcade">
        <div className="overlay-head">
          {current
            ? <button className="arcade-back" onClick={() => setGame(null)}>← All games</button>
            : <b>🖥️ Duaa's Games</b>}
          {current && <b>{current.icon} {current.title}</b>}
          <button onClick={() => setOpen(false)} aria-label="Close games">✕</button>
        </div>
        {current ? <current.Game key={current.id} /> : (
          <>
            <p className="arcade-sub">Pick a game.</p>
            <div className="arcade-menu">
              {GAMES.map((g) => (
                <button key={g.id} className="arcade-card" onClick={() => setGame(g.id)}>
                  <span className="arcade-icon" aria-hidden="true">{g.icon}</span>
                  <span className="arcade-text">
                    <b>{g.title}</b>
                    <small>{g.blurb}</small>
                    <em>Best: {bestOf(g.key)} {g.unit}</em>
                  </span>
                  <span className="arcade-go" aria-hidden="true">▶</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
