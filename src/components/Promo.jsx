import { useEffect, useRef, useState } from 'react'
import { doMove, stopSpeaking, openWindow, watchWindow } from '../lib/fx'
import { unlock } from '../lib/achievements'

// Scene start times match the After Effects composition (after-effects/build/build_promo.jsx, DUR table).
const CHAPTERS = [
  { t: 0, label: 'Intro' },
  { t: 4.8, label: 'Hello' },
  { t: 10, label: 'Featured games' },
  { t: 14.6, label: 'More builds' },
  { t: 19, label: 'Achievements' },
  { t: 23.6, label: 'Profile' },
  { t: 31.3, label: "Let's connect" },
]
const LENGTH = 35

export default function Promo() {
  const video = useRef()
  const [time, setTime] = useState(0)
  const [started, setStarted] = useState(false)
  const [theatre, setTheatre] = useState(false)
  const active = CHAPTERS.reduce((a, c, i) => (time >= c.t ? i : a), 0)

  const play = (t) => {
    const v = video.current
    if (t !== undefined) v.currentTime = t
    stopSpeaking() // the avatar shouldn't talk over the video
    v.play()
    setStarted(true)
  }
  const toggleTheatre = () => { if (!theatre) openWindow('theatre'); setTheatre(!theatre) }
  useEffect(() => watchWindow('theatre', null, () => setTheatre(false)), [])

  useEffect(() => {
    document.documentElement.classList.toggle('theatre', theatre)
    if (!theatre) return
    const esc = (e) => e.key === 'Escape' && setTheatre(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [theatre])

  // pause when scrolled away
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting && !video.current.paused) video.current.pause() }, { threshold: 0.2 })
    io.observe(video.current)
    return () => io.disconnect()
  }, [])

  const ended = () => {
    setTheatre(false)

    
    doMove('Victory')
    unlock('cinema')

  }

  return (
    <section className="block" id="reel">
      <h2 className="reveal">Watch my <span>promo</span></h2>
      <p className="reveal promo-intro">A short introduction: who I am, the games I build and what I'm looking for next.</p>
      {/* data-stage, not a class: React rewriting className would wipe the scroll-reveal's 'in' class */}
      <div className="promo reveal" data-stage={theatre || undefined}>
        <div className="promo-screen">
          <video
            ref={video}
            src="/videos/promo.mp4"
            poster="/posters/promo.jpg"
            preload="metadata"
            playsInline
            controls={started}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onEnded={ended}
          />
          {!started && (
            <button className="promo-play" onClick={() => { play() }} aria-label="Play the promo video">
              <span>▶</span><b>Play promo</b><small>Sound on 🔊</small>
            </button>
          )}
        </div>
        <div className="promo-bar" aria-hidden="true">
          {CHAPTERS.map((c, i) => {
            const end = CHAPTERS[i + 1]?.t ?? LENGTH
            const fill = Math.max(0, Math.min(1, (time - c.t) / (end - c.t)))
            return <i key={c.t} style={{ flex: end - c.t }}><b style={{ width: `${fill * 100}%` }} /></i>
          })}
        </div>
        <div className="promo-tools">
          <div className="chapters" role="group" aria-label="Chapters">
            {CHAPTERS.map((c, i) => (
              <button key={c.t} className={started && i === active ? 'active' : ''} onClick={() => { play(c.t) }}>
                <small>{`0:${String(Math.floor(c.t)).padStart(2, '0')}`}</small>{c.label}
              </button>
            ))}
          </div>
          <button className="theatre-btn" onClick={toggleTheatre} aria-pressed={theatre}>
            {theatre ? '💡 Lights on' : '🎬 Theatre mode'}
          </button>
        </div>
        <p className="credit">
          Music: “Voxel Revolution” by Kevin MacLeod (incompetech.com), licensed under{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
        </p>
      </div>
    </section>
  )
}
