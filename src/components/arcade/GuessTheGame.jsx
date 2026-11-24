import { useEffect, useMemo, useRef, useState } from 'react'
import { projects } from '../../data/projects'
import { doMove, sfx } from '../../lib/fx'

// "Guess the Game": a screenshot from one of Duaa's games starts blurred and sharpens over a few seconds; pick the
// title from four choices. Faster answers score more. Five rounds.
const ROUNDS = 5, REVEAL = 8 // seconds from fully blurred to sharp
const POOL = projects.filter((p) => p.video) // projects with a poster frame
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1])
const best0 = () => { try { return +localStorage.getItem('guess-best') || 0 } catch { return 0 } }

function makeRounds() {
  return shuffle(POOL).slice(0, ROUNDS).map((answer) => ({
    answer,
    options: shuffle([answer, ...shuffle(POOL.filter((p) => p.id !== answer.id)).slice(0, 3)]),
  }))
}

export default function GuessTheGame() {
  const [rounds, setRounds] = useState(null) // null = start screen
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(best0)
  const [t, setT] = useState(0)
  const started = useRef(0)
  const round = rounds?.[i]
  const done = rounds && i >= ROUNDS

  // reveal timer for the current round
  useEffect(() => {
    if (!round || picked) return
    started.current = performance.now()
    let raf
    const tick = () => {
      const s = (performance.now() - started.current) / 1000
      setT(Math.min(s, REVEAL))
      if (s < REVEAL) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [round, picked])

  const start = () => { setRounds(makeRounds()); setI(0); setScore(0); setPicked(null) }

  const pick = (p) => {
    if (picked) return
    setPicked(p.id)
    const right = p.id === round.answer.id
    if (right) {
      const pts = 20 + Math.round(80 * (1 - t / REVEAL)) // 100 for an instant guess, 20 at full reveal
      setScore((s) => s + pts)
      sfx('coin'); doMove('Victory')
    } else {
      sfx('hit'); doMove('Shrug')
    }
    setTimeout(() => { setPicked(null); setT(0); setI((n) => n + 1) }, 1400)
  }

  useEffect(() => {
    if (!done) return
    setBest((b) => {
      const nb = Math.max(b, score)
      try { localStorage.setItem('guess-best', String(nb)) } catch { /* ignore */ }
      return nb
    })
  }, [done, score])

  const blur = useMemo(() => (picked ? 0 : 22 * (1 - t / REVEAL)), [t, picked])

  if (!rounds || done) {
    return (
      <div className="arcade-game guess">
        <p className="game-intro">A screenshot from one of my games slowly comes into focus. Guess which game it is: the faster, the more points.</p>
        <div className="guess-card guess-start">
          {done && <div className="game-score">You scored {score}{score >= best && score > 0 ? ' · New best!' : ''}</div>}
          <div className="game-best">Best: {best}</div>
          <button className="btn primary" onClick={start}>{done ? '↻ Play again' : '▶ Play'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="arcade-game guess">
      <div className="guess-top">
        <span>Round {i + 1} / {ROUNDS}</span>
        <span>Score {score}</span>
      </div>
      <div className="guess-card">
        <img src={`/posters/${round.answer.id}.jpg`} alt="A screenshot from one of Duaa's games" style={{ filter: `blur(${blur}px) saturate(${picked ? 1 : 0.6 + 0.4 * (t / REVEAL)})` }} />
        <div className="guess-timer"><i style={{ width: `${(1 - t / REVEAL) * 100}%` }} /></div>
      </div>
      <div className="guess-options">
        {round.options.map((p) => {
          const state = !picked ? '' : p.id === round.answer.id ? 'right' : p.id === picked ? 'wrong' : 'dim'
          return <button key={p.id} className={state} onClick={() => pick(p)} disabled={!!picked}>{p.title}</button>
        })}
      </div>
      {picked && <p className="guess-fact">{round.answer.title}: {round.answer.summary}</p>}
    </div>
  )
}
