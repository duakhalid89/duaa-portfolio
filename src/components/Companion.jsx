import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Avatar, tapReaction } from './Hero'
import { doMove, say, stopSpeaking } from '../lib/fx'
import { unlock } from '../lib/achievements'

// What she shows and says when each section first scrolls into view (`hint` bubble + `speak` aloud), and the longer
// lines she speaks during the guided tour.
const SECTIONS = [
  { id: 'about', speak: "I'm a Computer Science student at NED University, specialising in game development and animation. My CV is right here.", hint: 'About me, and my CV.', tour: "First, a little about me. I'm a Computer Science student at NED University, specialising in game development and animation." },
  { id: 'reel', speak: 'Here is a short introduction to who I am, the games I build and what I am looking for next.', hint: 'A short introduction video.', tour: 'This short video introduces who I am, the games I build and what I am looking for next. You can jump to any chapter.' },
  { id: 'room', speak: 'Welcome to my studio. Click any object to explore my work.', hint: 'Click any object to explore.', tour: 'This is my studio. Each object leads somewhere: the computer has my games, the trophy is my GameCon prize, and the bookshelf is my education.' },
  { id: 'skills', speak: 'These are my skills: Unity, Unreal Engine, C sharp, C plus plus, and more.', hint: 'Unity, Unreal, C#, C++ and more.', tour: 'These are my skills. Unity and Unreal Engine are my main engines, and I write gameplay code in C sharp and C plus plus.' },
  { id: 'projects', speak: 'These are my projects. Choose one to see its trailer and details.', hint: 'Choose a project to explore.', tour: 'Here are my projects. You can filter them by engine, search, and watch the gameplay trailers.' },
  { id: 'journey', speak: 'This is my journey: my internships at TreeObit Studios and The Game Storm Studios, and my degree at NED University.', hint: 'My internships and education.', tour: 'This is my journey: internships at TreeObit Studios and The Game Storm Studios, freelance work, and my degree.' },
  { id: 'contact', speak: "If you'd like to work together, send me a message here. I'd love to hear from you.", hint: "Let's work together.", tour: "Finally, if you'd like to work together, send me a message here. Thank you for taking the tour!" },
]

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

export default function Companion() {
  const [visible, setVisible] = useState(false)
  const [bubble, setBubble] = useState('')
  const [tour, setTour] = useState(-1) // index into SECTIONS while the tour runs
  const pose = useRef({ reach: 0, pinch: 0, wave: 0 })
  const target = useRef(new THREE.Vector3())
  const seen = useRef(new Set())
  const hideTimer = useRef()
  const touring = tour >= 0

  // Speak a section line while scrolling. Browsers only allow speech after the visitor has clicked or tapped the page
  // once, and the promo video takes priority over her voice.
  const speakHint = useCallback((text) => {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
    const promo = document.querySelector('#reel video')
    if (promo && !promo.paused) return
    say(text)
  }, [])

  const show = useCallback((text, ms = 4500) => {
    setBubble(text)
    clearTimeout(hideTimer.current)
    if (ms) hideTimer.current = setTimeout(() => setBubble(''), ms)
  }, [])

  // appear once the hero is scrolled away
  useEffect(() => {
    const hero = document.getElementById('home')
    if (!hero) return
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0.2 })
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  // react to each section the first time it comes into view (outside the tour)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting || touring || seen.current.has(e.target.id)) return
      seen.current.add(e.target.id)
      const s = SECTIONS.find((x) => x.id === e.target.id)
      if (s) { show(s.hint, 6000); doMove(e.target.id === 'contact' ? 'Wave' : 'Point'); speakHint(s.speak) }
    }), { rootMargin: '-45% 0px -45% 0px' }) // fires when the section crosses the middle of the screen
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [show, speakHint, touring])

  // the guided tour: scroll to each section, point and speak, then move on
  useEffect(() => {
    const start = () => { setTour(0) }
    window.addEventListener('tour:start', start)
    return () => window.removeEventListener('tour:start', start)
  }, [])
  useEffect(() => {
    if (tour < 0) return
    if (tour >= SECTIONS.length) { setTour(-1); doMove('Victory'); unlock('tourist'); show('Thanks for the tour! 💜', 3500); return }
    let alive = true
    const s = SECTIONS[tour]
    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    show(s.tour, 0)
    const t0 = setTimeout(() => doMove(tour === 0 ? 'Wave' : 'Point'), 700)
    // advance when she finishes speaking (or after a reading pause when muted / no voice)
    const minWait = new Promise((r) => setTimeout(r, Math.max(3500, s.tour.length * 55)))
    const spoken = new Promise((r) => setTimeout(() => say(s.tour).then(r), 600))
    Promise.all([spoken, minWait]).then(() => alive && setTour((i) => (i >= 0 ? i + 1 : i)))
    return () => { alive = false; clearTimeout(t0) }
  }, [tour, show])

  const stopTour = () => { stopSpeaking(); setTour(-1); setBubble('') }

  const tap = () => { if (!touring) show(tapReaction(), 3000) }
  const on = visible || touring

  return (
    <div className={`companion${on ? ' on' : ''}`} aria-hidden={!on}>
      {bubble && (
        <div className="bubble" role="status">
          {bubble}
          {touring && (
            <div className="bubble-actions">
              <span>{tour + 1}/{SECTIONS.length}</span>
              <button onClick={() => { stopSpeaking(); setTour((i) => i + 1) }}>Next ›</button>
              <button onClick={stopTour}>Stop</button>
            </div>
          )}
        </div>
      )}
      <div className="companion-stage" title="Tap me!">
        <Canvas frameloop={on ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ position: [0, 0.95, 3.3], fov: 35 }} gl={{ alpha: true, antialias: true }}
          onCreated={({ camera }) => camera.lookAt(0, 0.92, 0)}>
          <hemisphereLight args={['#efe8ff', '#3a1a66', 1.1]} />
          <directionalLight position={[2, 4, 3]} intensity={2.1} color="#fff4f9" />
          <directionalLight position={[-3, 2, -2]} intensity={1.6} color="#c084fc" />
          <Boundary>
            <Suspense fallback={null}>
              <Avatar copy pose={pose.current} target={target} onTap={tap} />
            </Suspense>
          </Boundary>
        </Canvas>
      </div>
    </div>
  )
}
