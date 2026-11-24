import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { iconCanvas } from '../data/icons'

// Skill ball pit: each skill is a glass ball with its logo. A small hand-written physics step (gravity, wall and
// floor bounces, ball-to-ball collisions) runs every frame; balls can be grabbed, dragged and thrown.
const SKILLS = [
  ['unity', 'Unity', '#f0abfc'], ['unrealengine', 'Unreal Engine', '#c4b5fd'], ['C#', 'C#', '#a78bfa'],
  ['cplusplus', 'C++', '#93c5fd'], ['blender', 'Blender', '#fdba74'], ['threedotjs', 'Three.js', '#f9a8d4'],
  ['oculus', 'Meta Quest VR', '#fda4af'], ['nodedotjs', 'Node.js', '#86efac'], ['python', 'Python', '#fde68a'],
  ['javascript', 'JavaScript', '#fef08a'], ['react', 'React', '#67e8f9'], ['git', 'Git', '#fca5a5'],
  ['mysql', 'MySQL', '#7dd3fc'], ['php', 'PHP', '#c4b5fd'], ['laravel', 'Laravel', '#fda4af'], ['html5', 'HTML / CSS', '#fdba74'],
]
const G = 16, BOUNCE = 0.55, FRICTION = 0.985

function Balls({ drop, shake }) {
  const { viewport } = useThree()
  const W = viewport.width / 2, H = viewport.height / 2
  const R = Math.min(0.62, viewport.width / 16)
  const balls = useMemo(() => SKILLS.map(([slug, label, color], i) => ({
    slug, label, color, r: R * (0.85 + ((i * 37) % 10) / 30),
    p: new THREE.Vector2(), v: new THREE.Vector2(), spin: 0,
  })), [R])
  const groups = useRef([])
  const icons = useRef([])
  const drag = useRef({ i: -1, last: new THREE.Vector2() })
  const [hover, setHover] = useState(-1)
  const textures = useMemo(() => SKILLS.map(([slug, , color]) => {
    const t = new THREE.CanvasTexture(iconCanvas(slug, color, 256))
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }), [])

  // drop: start every ball above the pit, staggered so they rain in
  useEffect(() => {
    balls.forEach((b, i) => {
      b.p.set(-W + b.r + Math.random() * (2 * W - 2 * b.r), H + 1 + i * 0.7)
      b.v.set((Math.random() - 0.5) * 2, 0)
    })
  }, [drop, balls, W, H])
  // shake: kick everything upward
  useEffect(() => {
    if (!shake) return
    balls.forEach((b) => b.v.add(new THREE.Vector2((Math.random() - 0.5) * 9, 7 + Math.random() * 6)))
  }, [shake, balls])

  useEffect(() => {
    const up = () => { if (drag.current.i >= 0) { drag.current.i = -1; document.body.style.cursor = '' } }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30) / 2
    const target = new THREE.Vector2(state.pointer.x * W, state.pointer.y * H)
    for (let step = 0; step < 2; step++) {
      balls.forEach((b, i) => {
        if (i === drag.current.i) {
          // follow the pointer; the velocity is kept so letting go throws the ball
          b.v.copy(target).sub(b.p).multiplyScalar(14)
          b.p.addScaledVector(b.v, dt)
          return
        }
        b.v.y -= G * dt
        b.p.addScaledVector(b.v, dt)
        if (b.p.x < -W + b.r) { b.p.x = -W + b.r; b.v.x = Math.abs(b.v.x) * BOUNCE }
        if (b.p.x > W - b.r) { b.p.x = W - b.r; b.v.x = -Math.abs(b.v.x) * BOUNCE }
        if (b.p.y < -H + b.r) {
          b.p.y = -H + b.r; b.v.y = Math.abs(b.v.y) * BOUNCE; b.v.x *= FRICTION
        }
      })
      // ball-to-ball: push overlapping pairs apart and bounce them along the contact normal
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], b = balls[j]
          const dx = b.p.x - a.p.x, dy = b.p.y - a.p.y
          const min = a.r + b.r, d2 = dx * dx + dy * dy
          if (d2 >= min * min || d2 === 0) continue
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (min - d) / 2
          const ma = i === drag.current.i ? 0 : 1, mb = j === drag.current.i ? 0 : 1
          a.p.x -= nx * push * ma * (mb ? 1 : 2); a.p.y -= ny * push * ma * (mb ? 1 : 2)
          b.p.x += nx * push * mb * (ma ? 1 : 2); b.p.y += ny * push * mb * (ma ? 1 : 2)
          const rel = (b.v.x - a.v.x) * nx + (b.v.y - a.v.y) * ny
          if (rel < 0) {
            const k = -(1 + BOUNCE) * rel / (ma + mb || 1)
            a.v.x -= k * nx * ma; a.v.y -= k * ny * ma
            b.v.x += k * nx * mb; b.v.y += k * ny * mb
          }
        }
      }
    }
    balls.forEach((b, i) => {
      b.spin -= (b.v.x * delta) / b.r // roll with horizontal speed
      const g = groups.current[i]
      if (!g) return
      g.position.set(b.p.x, b.p.y, 0)
      icons.current[i].rotation.z = b.spin
      const s = THREE.MathUtils.damp(g.scale.x, hover === i || drag.current.i === i ? 1.12 : 1, 10, delta)
      g.scale.setScalar(s)
    })
  })

  return balls.map((b, i) => (
    <group key={b.slug} ref={(el) => { groups.current[i] = el }}>
      <mesh
        onPointerDown={(e) => { e.stopPropagation(); drag.current.i = i; document.body.style.cursor = 'grabbing' }}
        onPointerOver={() => { setHover(i); if (drag.current.i < 0) document.body.style.cursor = 'grab' }}
        onPointerOut={() => { setHover(-1); if (drag.current.i < 0) document.body.style.cursor = '' }}
      >
        <sphereGeometry args={[b.r, 32, 32]} />
        <meshPhysicalMaterial color="#1a1030" emissive={b.color} emissiveIntensity={hover === i ? 0.35 : 0.12} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh ref={(el) => { icons.current[i] = el }} position={[0, 0, b.r * 1.001]}>
        <planeGeometry args={[b.r * 1.75, b.r * 1.75]} />
        <meshBasicMaterial map={textures[i]} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  ))
}

export default function SkillPit() {
  const wrap = useRef()
  const [visible, setVisible] = useState(false)
  const [drop, setDrop] = useState(0)
  const [shake, setShake] = useState(0)
  useEffect(() => {
    let first = true
    const io = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting)
      if (e.isIntersecting && first) { first = false; setDrop((d) => d + 1) } // rain in the first time it is seen
    }, { threshold: 0.3 })
    io.observe(wrap.current)
    return () => io.disconnect()
  }, [])
  return (
    <div className="pit reveal" ref={wrap}>
      {/* orthographic: no perspective parallax between each ball and its logo */}
      <Canvas orthographic frameloop={visible ? 'always' : 'never'} dpr={[1, 2]} camera={{ position: [0, 0, 10], zoom: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 6]} intensity={1.6} />
        <pointLight position={[-4, 2, 3]} intensity={8} color="#ec4899" />
        <Balls drop={drop} shake={shake} />
      </Canvas>
      <div className="pit-ui">
        <span>🖐️ Grab & throw my skills</span>
        <button onClick={() => { setDrop((d) => d + 1) }}>🔁 Drop again</button>
        <button onClick={() => { setShake((s) => s + 1) }}>🌪️ Shake</button>
      </div>
    </div>
  )
}
