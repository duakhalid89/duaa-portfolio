import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { hubs, projectsByHub } from '../data/projects'
import { iconCanvas } from '../data/icons'

function cardCanvas(project, color) {
  const w = 640, h = 360
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')
  const bg = g.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#3b1c72')
  bg.addColorStop(1, '#a11d63')
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  g.strokeStyle = color
  g.lineWidth = 6
  g.strokeRect(3, 3, w - 6, h - 6)
  g.fillStyle = '#fff'
  g.font = '700 54px "Space Grotesk", system-ui, sans-serif'
  g.textAlign = 'center'
  const words = project.title.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const t = line ? `${line} ${word}` : word
    if (g.measureText(t).width > w - 80 && line) { lines.push(line); line = word } else line = t
  }
  lines.push(line)
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 62 + 14))
  g.font = '500 22px "JetBrains Mono", monospace'
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.fillText(project.badge || project.year, w / 2, h - 28)
  return c
}

function ProjectCard({ project, color, angle, radius, onOpen, hoverRef }) {
  const [hover, setHover] = useState(false)
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(cardCanvas(project, color))
    t.colorSpace = THREE.SRGBColorSpace
    // Swap in the real poster once it loads (public/posters/<id>.jpg).
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 640; c.height = 360
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0, 640, 360)
      g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(3, 3, 634, 354)
      t.image = c; t.needsUpdate = true
    }
    if (project.video) img.src = `/posters/${project.id}.jpg`
    return t
  }, [project, color])
  const mesh = useRef()
  useFrame((_, d) => {
    mesh.current.scale.setScalar(THREE.MathUtils.damp(mesh.current.scale.x, hover ? 1.35 : 1, 8, d))
  })
  return (
    <group position={[Math.cos(angle) * radius, Math.sin(angle * 3) * 0.25, Math.sin(angle) * radius * 0.8]}>
      <Billboard>
        <mesh
          ref={mesh}
          onClick={(e) => { e.stopPropagation(); onOpen(project) }}
          onPointerOver={() => { setHover(true); hoverRef.current = true; document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHover(false); hoverRef.current = false; document.body.style.cursor = '' }}
        >
          <planeGeometry args={[1.6, 0.9]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  )
}

function Core({ hub }) {
  const mesh = useRef()
  const rings = useRef()
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(iconCanvas(hub.icon, hub.color, 768))
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [hub])
  useFrame((s, d) => {
    rings.current.rotation.z += d * 0.4
    rings.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.5) * 0.3
  })
  return (
    <group>
      <Billboard>
        <mesh ref={mesh}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </Billboard>
      <group ref={rings}>
        <mesh><torusGeometry args={[1.25, 0.012, 8, 120]} /><meshBasicMaterial color={hub.color} toneMapped={false} /></mesh>
        <mesh rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[1.45, 0.008, 8, 120]} /><meshBasicMaterial color="#ec4899" toneMapped={false} /></mesh>
      </group>
    </group>
  )
}

function Orbit({ hub, onOpen }) {
  const list = projectsByHub(hub.id)
  const group = useRef()
  const vel = useRef(0.18)
  const hovering = useRef(false)
  const drag = useRef(null)
  const { gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const down = (e) => { drag.current = { x: e.clientX } }
    const move = (e) => {
      if (!drag.current) return
      vel.current = THREE.MathUtils.clamp(vel.current + (e.clientX - drag.current.x) * 0.004, -3, 3)
      drag.current.x = e.clientX
    }
    const up = () => { drag.current = null }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])

  useFrame((_, d) => {
    const base = hovering.current ? 0 : 0.18
    if (!drag.current) vel.current = THREE.MathUtils.damp(vel.current, base, 2.2, d)
    group.current.rotation.y += vel.current * d
  })

  const radius = Math.max(3.2, list.length * 0.55)
  return (
    <group ref={group}>
      {list.map((p, i) => (
        <ProjectCard
          key={p.id}
          project={p}
          color={hub.color}
          angle={(i / list.length) * Math.PI * 2}
          radius={radius}
          onOpen={onOpen}
          hoverRef={hovering}
        />
      ))}
    </group>
  )
}

function CameraIntro() {
  const { camera } = useThree()
  const t = useRef(0)
  useFrame((s, d) => {
    t.current = Math.min(1, t.current + d / 1.2)
    const e = 1 - Math.pow(1 - t.current, 3)
    camera.position.set(0, 1.2 + e * 1.2, 1.5 + e * 7.5)
    camera.lookAt(0, 0, 0)
  })
  return null
}

function ProjectPanel({ project, onClose }) {
  const closeRef = useRef()
  useEffect(() => {
    closeRef.current?.focus()
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="panel" role="dialog" aria-modal="true" aria-label={project.title} onClick={onClose}>
      <div className={`panel-card${project.video ? '' : ' no-media'}`} onClick={(e) => e.stopPropagation()}>
        {project.video && (
          <div className="panel-media">
            <video src={`/videos/${project.id}.mp4`} poster={`/posters/${project.id}.jpg`} autoPlay muted loop playsInline controls />
          </div>
        )}
        <div className="panel-info">
          {project.badge && <span className="badge">{project.badge}</span>}
          <h3>{project.title}</h3>
          <p>{project.detail}</p>
          <div className="chips">{project.stack.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
          <p><b>Role:</b> {project.role} · {project.year}</p>
          <button ref={closeRef} className="btn panel-close" onClick={onClose}>Back to orbit</button>
        </div>
      </div>
    </div>
  )
}

export default function Universe({ hubId, initialProject, onClose, onSwitch }) {
  const hub = hubs.find((h) => h.id === hubId)
  const list = projectsByHub(hubId)
  const [open, setOpen] = useState(() => list.find((p) => p.id === initialProject) || null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const k = (e) => e.key === 'Escape' && !open && onClose()
    window.addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k); document.body.style.cursor = '' }
  }, [onClose, open])

  return (
    <div className="universe" role="region" aria-label={`${hub.label} projects`}>
      <div className="uni-top">
        <div className="uni-title">
          <h2 className="grad-text">{hub.label}</h2>
          <p>{hub.blurb} · {list.length} project{list.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn" onClick={onClose}>✕ Exit</button>
      </div>

      <Canvas key={hubId} dpr={[1, 1.75]} camera={{ fov: 40, position: [0, 2.4, 9] }}>
        <Suspense fallback={null}>
          <CameraIntro />
          <Core hub={hub} />
          <Orbit hub={hub} onOpen={setOpen} />
        </Suspense>
        <Sparkles count={110} scale={[16, 8, 12]} size={3} speed={0.35} color="#f0abfc" />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.6} />
        </EffectComposer>
      </Canvas>

      <div className="uni-list" aria-label="Projects">
        {list.map((p) => <button key={p.id} onClick={() => setOpen(p)}>{p.title}</button>)}
      </div>
      <div className="uni-hint">drag to spin · hover to pause · click a card to open the project</div>
      <div className="uni-switch">
        {hubs.map((h) => (
          <button key={h.id} className={h.id === hubId ? 'active' : ''} onClick={() => onSwitch(h.id)}>{h.label}</button>
        ))}
      </div>
      {open && <ProjectPanel project={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
