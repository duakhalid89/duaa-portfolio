import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { Avatar, SCARVES, setScarf } from './Hero'
import { doMove, setThinking, watchWindow } from '../lib/fx'
import { unlock } from '../lib/achievements'

// Photo booth: pick a pose, scarf and backdrop, a 3-2-1 countdown snaps the 3D avatar, and the shot is framed as a
// downloadable photo card.
const POSES = [['Wave', '👋'], ['Victory', '🏆'], ['Gamer', '🎮'], ['Point', '👉'], ['Shrug', '🤷'], ['Think', '🤔']]
const BACKDROPS = {
  Neon: ['#2a1250', '#ec4899', '#0d0714'],
  Sunset: ['#fde68a', '#f472b6', '#4c1d95'],
  Ocean: ['#a5f3fc', '#3b82f6', '#1e1b4b'],
  Grid: ['#0d0714', '#22d3ee', '#0d0714'],
}
const SITE = 'duaa-portfolio-nu.vercel.app'

function backdropTexture([top, mid, bottom], grid) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 512
  const g = c.getContext('2d')
  const gr = g.createLinearGradient(0, 0, 0, 512)
  gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bottom)
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512)
  if (grid) {
    g.strokeStyle = 'rgba(236,72,153,0.55)'; g.lineWidth = 2
    for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 300); g.lineTo(256 + (i - 256) * 3, 512); g.stroke() }
    for (let y = 300; y <= 512; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke() }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

function Stage({ backdrop }) {
  const tex = useMemo(() => backdropTexture(BACKDROPS[backdrop], backdrop === 'Grid'), [backdrop])
  const pose = useRef({ reach: 0, pinch: 0, wave: 0 })
  const target = useRef(new THREE.Vector3())
  return (
    <>
      <mesh position={[0, 1.3, -2.5]}><planeGeometry args={[8, 6]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <hemisphereLight args={['#efe8ff', '#3a1a66', 1.1]} />
      <directionalLight position={[2, 4, 4]} intensity={2.2} color="#fff4f9" />
      <directionalLight position={[-3, 2, -1]} intensity={1.4} color="#c084fc" />
      <Boundary>
        <Suspense fallback={null}>
          <Avatar copy pose={pose.current} target={target} />
        </Suspense>
      </Boundary>
      <Sparkles count={40} scale={[4, 3, 2]} position={[0, 1.4, 0]} size={3} speed={0.3} color="#fdf2ff" />
    </>
  )
}

// Frame the shot as a 1080x1350 card with caption, name and site.
function makeCard(shot, caption) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 1080; c.height = 1350
      const g = c.getContext('2d')
      const bg = g.createLinearGradient(0, 0, 1080, 1350)
      bg.addColorStop(0, '#1a0b33'); bg.addColorStop(1, '#3b0d3a')
      g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350)
      // photo with a rounded neon frame (cropped to fill a 960x960 square)
      const s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2
      g.save()
      g.beginPath(); g.roundRect(60, 60, 960, 960, 40); g.clip()
      g.drawImage(img, sx, sy, s, s, 60, 60, 960, 960)
      g.restore()
      g.lineWidth = 8
      const fr = g.createLinearGradient(60, 60, 1020, 1020)
      fr.addColorStop(0, '#8b5cf6'); fr.addColorStop(1, '#ec4899')
      g.strokeStyle = fr; g.shadowColor = '#ec4899'; g.shadowBlur = 30
      g.beginPath(); g.roundRect(60, 60, 960, 960, 40); g.stroke()
      g.shadowBlur = 0
      g.textAlign = 'center'
      g.fillStyle = '#ffffff'
      g.font = 'bold 64px "Space Grotesk", Arial, sans-serif'
      g.fillText(caption, 540, 1125)
      g.fillStyle = '#f0abfc'
      g.font = '500 34px "Inter", Arial, sans-serif'
      g.fillText('Duaa Khalid · Game Developer · Unity & Unreal', 540, 1190)
      g.fillStyle = '#c4b5fd'
      g.font = '500 28px "JetBrains Mono", monospace'
      g.fillText(`${SITE} · ${new Date().toLocaleDateString()}`, 540, 1250)
      resolve(c.toDataURL('image/png'))
    }
    img.src = shot
  })
}

export default function PhotoBooth() {
  const [open, setOpen] = useState(false)
  const [poseName, setPoseName] = useState('Victory')
  const [backdrop, setBackdrop] = useState('Neon')
  const [caption, setCaption] = useState('I met Duaa Khalid! 🎮')
  const [count, setCount] = useState(0)
  const [flash, setFlash] = useState(false)
  const [card, setCard] = useState(null)
  const gl = useRef()

  useEffect(() => watchWindow('booth', () => { setOpen(true); setCard(null) }, () => setOpen(false)), [])
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc) }
  }, [open])

  const preview = (p) => { setPoseName(p); if (p === 'Think') { setThinking(true); setTimeout(() => setThinking(false), 2500) } else doMove(p) }

  const snap = async () => {
    if (count) return
    for (const n of [3, 2, 1]) {
      setCount(n)
      if (n === 1) { if (poseName === 'Think') setThinking(true); else doMove(poseName) } // peak of the pose ≈ 0.7 s later
      await new Promise((r) => setTimeout(r, 700))
    }
    setCount(0)
    const shot = gl.current.domElement.toDataURL('image/png')
    if (poseName === 'Think') setThinking(false)
    setFlash(true); setTimeout(() => setFlash(false), 300)
    setCard(await makeCard(shot, caption.trim() || 'I met Duaa Khalid! 🎮'))
    unlock('photo')
  }

  if (!open) return null
  return (
    <div className="booth" role="dialog" aria-modal="true" aria-label="Photo booth">
      <div className="booth-card glass">
        <div className="booth-head">
          <b>📸 Photo booth</b>
          <button onClick={() => { setOpen(false) }} aria-label="Close photo booth">✕</button>
        </div>
        {card ? (
          <div className="booth-result">
            <img src={card} alt="Your photo card with Duaa's avatar" />
            <div className="booth-actions">
              <a className="btn primary" href={card} download="duaa-khalid-photo.png">⬇ Download</a>
              <button className="btn" onClick={() => setCard(null)}>↻ Retake</button>
            </div>
          </div>
        ) : (
          <div className="booth-body">
            <div className="booth-stage">
              <Canvas gl={{ preserveDrawingBuffer: true, antialias: true }} dpr={[1, 2]} camera={{ position: [0, 1.0, 4.1], fov: 32 }}
                onCreated={(s) => { gl.current = s.gl; s.camera.lookAt(0, 0.95, 0) }}>
                <Stage backdrop={backdrop} />
              </Canvas>
              {count > 0 && <div className="booth-count" key={count}>{count}</div>}
              {flash && <div className="booth-flash" />}
            </div>
            <div className="booth-controls">
              <label>Pose</label>
              <div className="booth-row">
                {POSES.map(([p, e]) => <button key={p} className={poseName === p ? 'on' : ''} onClick={() => preview(p)}>{e} {p}</button>)}
              </div>
              <label>Scarf</label>
              <div className="booth-row">
                {SCARVES.map((sw) => <button key={sw.name} className="swatch" style={{ '--sw': sw.color || '#1e3a6e' }} aria-label={`${sw.name} scarf`} onClick={() => setScarf(sw)} />)}
              </div>
              <label>Backdrop</label>
              <div className="booth-row">
                {Object.keys(BACKDROPS).map((b) => <button key={b} className={backdrop === b ? 'on' : ''} onClick={() => setBackdrop(b)}>{b}</button>)}
              </div>
              <label htmlFor="booth-caption">Caption</label>
              <input id="booth-caption" value={caption} maxLength={32} onChange={(e) => setCaption(e.target.value)} />
              <button className="btn primary booth-snap" onClick={snap} disabled={count > 0}>📸 Take photo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
