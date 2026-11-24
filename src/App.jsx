import { useCallback, useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import Hero from './components/Hero'
import Universe from './components/Universe'
import Chatbot from './components/Chatbot'
import Companion from './components/Companion'
import Arcade from './components/arcade/Arcade'
import Promo from './components/Promo'
import Room from './components/Room'
import PhotoBooth from './components/PhotoBooth'
import { FunLayer, TrophyButton } from './components/Fun'
import { unlock } from './lib/achievements'
import { isMuted, openWindow, setMuted, subscribe, watchWindow } from './lib/fx'
import { About, Skills, Gallery, Experience, Contact, Footer } from './components/Sections'
import { profile } from './data/profile'

function Loader() {
  const { progress, active } = useProgress()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setDone(true), 400)
      return () => clearTimeout(t)
    }
  }, [active, progress])
  const c = 2 * Math.PI * 70
  return (
    <div className={`loader${done ? ' done' : ''}`} aria-hidden={done}>
      <div className="loader-ring">
        <svg viewBox="0 0 160 160">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#ec4899" /></linearGradient>
          </defs>
          <circle className="track" cx="80" cy="80" r="70" />
          <circle className="bar" cx="80" cy="80" r="70" strokeDasharray={c} strokeDashoffset={c * (1 - progress / 100)} />
        </svg>
        <span className="loader-mark">DK</span>
        <span className="loader-pct">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

function MuteButton() {
  const [m, setM] = useState(isMuted)
  useEffect(() => subscribe((type, d) => { if (type === 'mute') setM(d) }), [])
  return (
    <button className="icon-btn" onClick={() => setMuted(!m)} aria-label={m ? 'Turn voice on' : 'Mute voice'} title={m ? 'Voice off' : 'Voice on'}>
      {m ? '🔇' : '🔊'}
    </button>
  )
}

function Nav({ theme, onTheme }) {
  const links = [['About', '#about'], ['Reel', '#reel'], ['Room', '#room'], ['Skills', '#skills'], ['Projects', '#projects'], ['Journey', '#journey'], ['Contact', '#contact']]
  return (
    <header className="nav">
      <a className="nav-logo" href="#home">DUAA.K</a>
      <div className="nav-right">
        <nav className="nav-links" aria-label="Primary">
          {links.map(([l, h]) => <a key={h} href={h}>{l}</a>)}
        </nav>
        <TrophyButton />
        <MuteButton />
        <button className="icon-btn" onClick={onTheme} aria-label="Toggle light and dark theme">{theme === 'dark' ? '☀' : '☾'}</button>
      </div>
    </header>
  )
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.12 })
    const scan = () => document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el))
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
  })
  const [hub, setHubState] = useState(null)
  const [firstProject, setFirstProject] = useState(null)
  const setHub = useCallback((id, projectId = null) => { openWindow('universe'); setHubState(id); setFirstProject(projectId); unlock('worlds') }, [])
  useReveal()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])

  const closeHub = useCallback(() => setHubState(null), [])
  useEffect(() => watchWindow('universe', null, () => setHubState(null)), [])

  return (
    <>
      <Loader />
      <Nav theme={theme} onTheme={() => { setTheme((t) => (t === 'dark' ? 'light' : 'dark')); unlock('nightowl') }} />
      <main>
        <Hero onEnterHub={setHub} />
        <About />
        <Promo />
        <Room />
        <Skills />
        <Gallery onOpenHub={setHub} />
        <Experience />
        <Contact />
      </main>
      <Footer profile={profile} />
      {hub && <Universe hubId={hub} initialProject={firstProject} onClose={closeHub} onSwitch={setHub} />}
      <FunLayer />
      <PhotoBooth />
      <Arcade />
      <Companion />
      <Chatbot />
    </>
  )
}
