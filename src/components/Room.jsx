import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, RoundedBox, Sparkles, useTexture } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { Avatar, tapReaction } from './Hero'
import { doMove, say, openWindow, watchWindow } from '../lib/fx'
import { unlock } from '../lib/achievements'

// "Step into my room": a game developer's studio built from Three.js primitives. Every object is a menu button that
// jumps to a part of the portfolio (or does something fun), like a game's diegetic menu.

// Object links leave walk mode first, then scroll to their section.
const go = (id) => {
  window.dispatchEvent(new Event('room:exit'))
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
}
// How far the pointer travelled since it went down: a drag to look around must not count as clicking an object.
const drag = { x: 0, y: 0, moved: 0 }
const SCREENS = ['unbroken-oath', 'mask-regime', 'spike-rush', 'escape-room-vr', 'abduction']

// Wraps an object: hover lifts it and shows a label, click runs `onPick`.
function Hotspot({ label, onPick, position, children, labelAt = [0, 0.6, 0], lift = 0.06 }) {
  const g = useRef()
  const [hover, setHover] = useState(false)
  useFrame((_, d) => {
    const s = THREE.MathUtils.damp(g.current.scale.x, hover ? 1.06 : 1, 10, d)
    g.current.scale.setScalar(s)
    g.current.position.y = THREE.MathUtils.damp(g.current.position.y, (position?.[1] || 0) + (hover ? lift : 0), 10, d)
  })
  return (
    <group
      ref={g}
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      onClick={(e) => { e.stopPropagation(); if (drag.moved > 6) return; onPick() }}
    >
      {children}
      {hover && (
        <Html position={labelAt} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="room-label">{label}</div>
        </Html>
      )}
    </group>
  )
}

function neonTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 256
  const g = c.getContext('2d')
  g.font = 'bold 150px "Space Grotesk", Arial, sans-serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.shadowColor = '#ec4899'; g.shadowBlur = 40
  g.lineWidth = 10; g.strokeStyle = '#f0abfc'
  g.strokeText('DK', 256, 120)
  g.fillStyle = '#ffffff'; g.shadowBlur = 20
  g.fillText('DK', 256, 120)
  g.font = '500 34px "JetBrains Mono", monospace'
  g.shadowColor = '#8b5cf6'
  g.fillStyle = '#c4b5fd'
  g.fillText('GAME DEV STUDIO', 256, 215)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Monitor() {
  const tex = useTexture(SCREENS.map((s) => `/posters/${s}.jpg`))
  const [i, setI] = useState(0)
  useEffect(() => {
    tex.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace })
    const id = setInterval(() => setI((x) => (x + 1) % tex.length), 2600)
    return () => clearInterval(id)
  }, [tex])
  return (
    <group>
      <RoundedBox args={[1.5, 0.92, 0.06]} radius={0.03} position={[0, 0.62, 0]}>
        <meshStandardMaterial color="#120a20" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.62, 0.032]}>
        <planeGeometry args={[1.4, 0.8]} />
        <meshBasicMaterial map={tex[i]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.12, -0.05]}><boxGeometry args={[0.08, 0.3, 0.08]} /><meshStandardMaterial color="#2a1a44" /></mesh>
      <mesh position={[0, 0, -0.05]}><boxGeometry args={[0.45, 0.03, 0.25]} /><meshStandardMaterial color="#2a1a44" /></mesh>
    </group>
  )
}

function Trophy() {
  const g = useRef()
  const spin = () => {
    gsap.to(g.current.rotation, { y: g.current.rotation.y + Math.PI * 4, duration: 1.4, ease: 'power3.out' })
    doMove('Victory')
    say('Second prize at GameCon 2026, for Unbroken Oath!')
    unlock('trophy')
    setTimeout(() => go('projects'), 1600)
  }
  const gold = <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.22} emissive="#7c4a00" emissiveIntensity={0.35} />
  return (
    <Hotspot label="🏆 GameCon 2026 · 2nd Prize" onPick={spin} position={[-2.75, 1.9, -1.2]} labelAt={[0, 0.75, 0]}>
      <group ref={g}>
        <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.2, 0.09, 0.3, 32, 1, true]} />{gold}</mesh>
        <mesh position={[0, 0.53, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.015, 8, 32]} />{gold}</mesh>
        <mesh position={[0.22, 0.4, 0]}><torusGeometry args={[0.07, 0.015, 8, 20]} />{gold}</mesh>
        <mesh position={[-0.22, 0.4, 0]}><torusGeometry args={[0.07, 0.015, 8, 20]} />{gold}</mesh>
        <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.025, 0.025, 0.14, 12]} />{gold}</mesh>
        <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.26, 0.1, 0.2]} /><meshStandardMaterial color="#1a1030" /></mesh>
      </group>
    </Hotspot>
  )
}

function Plant() {
  const g = useRef()
  const wiggle = () => {
    gsap.fromTo(g.current.rotation, { z: 0.25 }, { z: 0, duration: 1.2, ease: 'elastic.out(1.2, 0.25)' })
  }
  const leaf = <meshStandardMaterial color="#34d399" roughness={0.6} emissive="#065f46" emissiveIntensity={0.3} />
  return (
    <Hotspot label="🪴 Plant" onPick={wiggle} position={[2.45, 0, -2.35]} labelAt={[0, 1.4, 0]}>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.24, 0.18, 0.44, 24]} /><meshStandardMaterial color="#ec4899" roughness={0.5} /></mesh>
      <group ref={g} position={[0, 0.44, 0]}>
        {[[0, 0.35, 0, 0.22], [0.15, 0.55, 0.05, 0.18], [-0.14, 0.6, -0.04, 0.17], [0.02, 0.8, 0, 0.15], [-0.05, 0.45, 0.14, 0.16]].map(([x, y, z, r], k) => (
          <mesh key={k} position={[x, y, z]} scale={[1, 1.35, 1]}><sphereGeometry args={[r, 16, 16]} />{leaf}</mesh>
        ))}
      </group>
    </Hotspot>
  )
}

function Lamp({ on, toggle }) {
  return (
    <Hotspot label={on ? '💡 Lights off' : '💡 Lights on'} onPick={toggle} position={[-2.25, 0, -2.3]} labelAt={[0, 2.1, 0]}>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.22, 0.25, 0.04, 24]} /><meshStandardMaterial color="#2a1a44" /></mesh>
      <mesh position={[0, 0.85, 0]}><cylinderGeometry args={[0.025, 0.025, 1.7, 12]} /><meshStandardMaterial color="#c4b5fd" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 1.75, 0]}><coneGeometry args={[0.3, 0.35, 24, 1, true]} /><meshStandardMaterial color="#fde68a" side={THREE.DoubleSide} emissive="#fbbf24" emissiveIntensity={on ? 1.4 : 0.05} /></mesh>
      <pointLight position={[0, 1.55, 0.2]} intensity={on ? 9 : 0} distance={6} color="#ffd9a8" />
    </Hotspot>
  )
}

function Books() {
  const colors = ['#8b5cf6', '#ec4899', '#60a5fa', '#f0abfc', '#34d399', '#fbbf24', '#f472b6', '#a78bfa']
  return (
    <Hotspot label="📚 My education & journey" onPick={() => { say('My degree at NED University, and my internships.'); go('journey') }} position={[-2.65, 0, 0.9]} labelAt={[0, 2.2, 0]}>
      <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.5, 1.8, 1.3]} /><meshStandardMaterial color="#2a1a44" roughness={0.8} /></mesh>
      {[0.35, 0.9, 1.45].map((y, row) => (
        <group key={y} position={[0.2, y, 0]}>
          <mesh position={[0, -0.24, 0]}><boxGeometry args={[0.12, 0.03, 1.2]} /><meshStandardMaterial color="#3b2563" /></mesh>
          {colors.map((c, k) => (
            <mesh key={k} position={[0.02, -0.07 + ((k + row) % 3) * 0.015, -0.5 + k * 0.135]} rotation={[0, 0, (k + row) % 5 === 0 ? 0.18 : 0]}>
              <boxGeometry args={[0.2, 0.3 + ((k * 7 + row) % 4) * 0.03, 0.1]} />
              <meshStandardMaterial color={colors[(k + row * 3) % colors.length]} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </Hotspot>
  )
}

function Poster({ id, position, label, rotation = [0, 0, 0] }) {
  const tex = useTexture(`/posters/${id}.jpg`)
  tex.colorSpace = THREE.SRGBColorSpace
  return (
    <Hotspot label={label} onPick={() => go('projects')} position={position} labelAt={[0, 0.6, 0.1]} lift={0.03}>
      <group rotation={rotation}>
        <mesh><boxGeometry args={[1.0, 0.62, 0.03]} /><meshStandardMaterial color="#f0abfc" emissive="#8b5cf6" emissiveIntensity={0.6} /></mesh>
        <mesh position={[0, 0, 0.018]}><planeGeometry args={[0.94, 0.56]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      </group>
    </Hotspot>
  )
}

function Chair() {
  const g = useRef()
  const spin = () => gsap.to(g.current.rotation, { y: g.current.rotation.y + Math.PI * 2, duration: 1.2, ease: 'power2.out' })
  const purple = <meshStandardMaterial color="#6d28d9" roughness={0.55} />
  return (
    <Hotspot label="🪑 Spin the chair!" onPick={() => { spin() }} position={[0.6, 0, -1.0]} labelAt={[0, 1.6, 0]}>
      <group ref={g}>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.04, 0.04, 0.5, 12]} /><meshStandardMaterial color="#c4b5fd" metalness={0.7} /></mesh>
        <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.32, 0.32, 0.04, 5]} /><meshStandardMaterial color="#1a1030" /></mesh>
        <RoundedBox args={[0.6, 0.1, 0.55]} radius={0.04} position={[0, 0.55, 0]}>{purple}</RoundedBox>
        <RoundedBox args={[0.58, 0.8, 0.1]} radius={0.05} position={[0, 1.0, 0.25]}>{purple}</RoundedBox>
        <mesh position={[0, 1.0, 0.31]}><boxGeometry args={[0.08, 0.7, 0.01]} /><meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.8} /></mesh>
      </group>
    </Hotspot>
  )
}

function Desk() {
  const wood = <meshStandardMaterial color="#3b2563" roughness={0.7} />
  return (
    <group position={[0.6, 0, -2.2]}>
      <mesh position={[0, 0.95, 0]}><boxGeometry args={[2.8, 0.08, 1.0]} />{wood}</mesh>
      {[[-1.3, -0.4], [1.3, -0.4], [-1.3, 0.4], [1.3, 0.4]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.47, z]}><boxGeometry args={[0.07, 0.94, 0.07]} /><meshStandardMaterial color="#1a1030" /></mesh>
      ))}
      {/* RGB strip under the desk */}
      <mesh position={[0, 0.9, 0.5]}><boxGeometry args={[2.7, 0.015, 0.015]} /><meshBasicMaterial color="#f0abfc" toneMapped={false} /></mesh>
      <Hotspot label="🖥️ Play my games" onPick={() => { doMove('Gamer'); openWindow('game') }} position={[0, 0.99, -0.2]} labelAt={[0, 1.25, 0]}>
        <Monitor />
      </Hotspot>
      <RoundedBox args={[0.95, 0.04, 0.3]} radius={0.015} position={[-0.05, 1.01, 0.2]}>
        <meshStandardMaterial color="#1a1030" emissive="#8b5cf6" emissiveIntensity={0.25} />
      </RoundedBox>
      <Hotspot label="🎮 Play Code Catcher" onPick={() => { doMove('Gamer'); openWindow('game') }} position={[0.85, 1.0, 0.22]} labelAt={[0, 0.4, 0]}>
        <RoundedBox args={[0.34, 0.07, 0.2]} radius={0.03}><meshStandardMaterial color="#f5f0ff" roughness={0.35} /></RoundedBox>
        <mesh position={[-0.08, 0.05, 0]}><cylinderGeometry args={[0.025, 0.025, 0.04, 12]} /><meshStandardMaterial color="#1a1030" /></mesh>
        <mesh position={[0.08, 0.05, 0.02]}><sphereGeometry args={[0.02, 12, 12]} /><meshBasicMaterial color="#ec4899" toneMapped={false} /></mesh>
        <mesh position={[0.11, 0.05, -0.02]}><sphereGeometry args={[0.02, 12, 12]} /><meshBasicMaterial color="#60a5fa" toneMapped={false} /></mesh>
      </Hotspot>
      <Hotspot label="📱 Contact me" onPick={() => { say("I'd love to hear from you."); go('contact') }} position={[-0.95, 1.0, 0.15]} labelAt={[0, 0.4, 0]}>
        <RoundedBox args={[0.17, 0.02, 0.32]} radius={0.01} rotation={[0, 0.3, 0]}><meshStandardMaterial color="#1a1030" /></RoundedBox>
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, -0.3]}><planeGeometry args={[0.14, 0.28]} /><meshBasicMaterial color="#c084fc" toneMapped={false} /></mesh>
      </Hotspot>
      <mesh position={[1.25, 1.06, -0.25]}><cylinderGeometry args={[0.06, 0.05, 0.14, 16]} /><meshStandardMaterial color="#f9a8d4" /></mesh>
      <Hotspot label="📸 Photo booth" onPick={() => openWindow('booth')} position={[-0.55, 1.0, -0.05]} labelAt={[0, 0.45, 0]}>
        <RoundedBox args={[0.26, 0.17, 0.14]} radius={0.02} position={[0, 0.09, 0]}><meshStandardMaterial color="#f5f0ff" roughness={0.4} /></RoundedBox>
        <mesh position={[0, 0.09, 0.08]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.06, 0.06, 24]} /><meshStandardMaterial color="#1a1030" metalness={0.5} roughness={0.3} /></mesh>
        <mesh position={[0, 0.09, 0.112]}><circleGeometry args={[0.04, 24]} /><meshBasicMaterial color="#8b5cf6" toneMapped={false} /></mesh>
        <mesh position={[0.08, 0.19, 0]}><boxGeometry args={[0.06, 0.03, 0.05]} /><meshStandardMaterial color="#ec4899" /></mesh>
      </Hotspot>
    </group>
  )
}

function Walls({ neon, inside, onFloor }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={inside ? (e) => { if (drag.moved > 6) return; e.stopPropagation(); onFloor(e.point) } : undefined}>
        <planeGeometry args={[6, 6]} /><meshStandardMaterial color="#24163d" roughness={0.9} />
      </mesh>
      {inside && (
        // the two walls and the ceiling that the outside view leaves open
        <group>
          <mesh position={[3, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#211339" roughness={0.95} /></mesh>
          <mesh position={[0, 1.6, 3]} rotation={[0, Math.PI, 0]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#1c1033" roughness={0.95} /></mesh>
          <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[6, 6]} /><meshStandardMaterial color="#140b24" roughness={1} /></mesh>
          {[-1.5, 0, 1.5].map((z) => (
            <mesh key={z} position={[0, 3.18, z]}><boxGeometry args={[4.5, 0.02, 0.03]} /><meshBasicMaterial color={z ? '#8b5cf6' : '#ec4899'} toneMapped={false} /></mesh>
          ))}
          <mesh position={[2.99, 0.02, 0]}><boxGeometry args={[0.02, 0.02, 6]} /><meshBasicMaterial color="#8b5cf6" toneMapped={false} /></mesh>
          <mesh position={[0, 0.02, 2.99]}><boxGeometry args={[6, 0.02, 0.02]} /><meshBasicMaterial color="#ec4899" toneMapped={false} /></mesh>
          <Hotspot label="🚪 Leave the room" onPick={() => window.dispatchEvent(new Event('room:exit'))} position={[-1.4, 0, 2.97]} labelAt={[0, 2.4, -0.2]} lift={0}>
            <mesh position={[0, 1.05, 0]} rotation={[0, Math.PI, 0]}><boxGeometry args={[1.0, 2.1, 0.06]} /><meshStandardMaterial color="#4c2a85" roughness={0.6} /></mesh>
            <mesh position={[-0.38, 1.05, -0.05]}><sphereGeometry args={[0.04, 12, 12]} /><meshStandardMaterial color="#fde68a" metalness={0.8} roughness={0.2} /></mesh>
            <mesh position={[0, 2.3, -0.04]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.6, 0.18]} /><meshBasicMaterial color="#22c55e" toneMapped={false} /></mesh>
          </Hotspot>
        </group>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.005, 0.2]}><circleGeometry args={[1.5, 48]} /><meshStandardMaterial color="#5b21b6" roughness={1} /></mesh>
      <mesh position={[0, 1.6, -3]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#1c1033" roughness={0.95} /></mesh>
      <mesh position={[-3, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[6, 3.2]} /><meshStandardMaterial color="#211339" roughness={0.95} /></mesh>
      {/* neon edge lights where walls meet */}
      <mesh position={[-2.99, 0.02, 0]}><boxGeometry args={[0.02, 0.02, 6]} /><meshBasicMaterial color="#8b5cf6" toneMapped={false} /></mesh>
      <mesh position={[0, 0.02, -2.99]}><boxGeometry args={[6, 0.02, 0.02]} /><meshBasicMaterial color="#ec4899" toneMapped={false} /></mesh>
      {/* window with a starry sky */}
      <group position={[-2.98, 1.95, 1.8]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><planeGeometry args={[1.3, 1.1]} /><meshBasicMaterial color="#0b1440" toneMapped={false} /></mesh>
        <mesh position={[0.25, 0.2, 0.01]}><circleGeometry args={[0.12, 32]} /><meshBasicMaterial color="#fef3c7" toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.015]}><boxGeometry args={[0.03, 1.1, 0.02]} /><meshStandardMaterial color="#3b2563" /></mesh>
        <mesh position={[0, 0, 0.015]}><boxGeometry args={[1.3, 0.03, 0.02]} /><meshStandardMaterial color="#3b2563" /></mesh>
      </group>
      <Hotspot label="✨ About me" onPick={() => { say("Hi! I'm Duaa, a game developer from Karachi."); go('about') }} position={[0.6, 2.55, -2.95]} labelAt={[0, 0.55, 0.1]} lift={0.02}>
        <mesh><planeGeometry args={[1.5, 0.75]} /><meshBasicMaterial map={neon} transparent toneMapped={false} /></mesh>
        <pointLight position={[0, 0, 0.5]} intensity={2.5} distance={3} color="#ec4899" />
      </Hotspot>
      {/* wall shelf for the trophy */}
      <mesh position={[-2.8, 1.88, -1.2]}><boxGeometry args={[0.4, 0.05, 0.9]} /><meshStandardMaterial color="#3b2563" /></mesh>
    </group>
  )
}

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

function Scene({ lamp, toggleLamp, inside, onFloor }) {
  const neon = useMemo(neonTexture, [])
  const pose = useRef({ reach: 0, pinch: 0, wave: 0 })
  const target = useRef(new THREE.Vector3())
  return (
    <>
      <hemisphereLight args={['#c4b5fd', '#1a1030', lamp ? 0.55 : 0.25]} />
      <directionalLight position={[4, 6, 4]} intensity={lamp ? 1.1 : 0.35} color="#fff4f9" />
      <pointLight position={[2.5, 2.5, -1]} intensity={3} distance={6} color="#8b5cf6" />
      <Walls neon={neon} inside={inside} onFloor={onFloor} />
      {inside && (
        <>
          <Poster id="unbroken-oath" label="🏆 Unbroken Oath" position={[2.97, 2.0, -0.9]} rotation={[0, -Math.PI / 2, 0]} />
          <Poster id="abduction" label="🕹️ Abduction" position={[2.97, 2.0, 0.6]} rotation={[0, -Math.PI / 2, 0]} />
          <Poster id="escape-room-vr" label="🕹️ Escape Room VR" position={[1.3, 2.0, 2.97]} rotation={[0, Math.PI, 0]} />
        </>
      )}
      <Desk />
      <Chair />
      <Trophy />
      <Books />
      <Plant />
      <Lamp on={lamp} toggle={toggleLamp} />
      <Poster id="spike-rush" label="🕹️ Spike Rush" position={[-1.55, 2.0, -2.97]} />
      <Poster id="mask-regime" label="🕹️ Mask Regime" position={[2.3, 2.1, -2.97]} />
      <Poster id="germ-endless-runner" label="🕹️ Germ Endless Runner" position={[-2.97, 2.25, -0.05]} rotation={[0, Math.PI / 2, 0]} />
      <Boundary>
        <group position={[-0.9, 0, -0.5]} rotation={[0, 0.5, 0]}>
          <Avatar copy pose={pose.current} target={target} scale={0.92} onTap={tapReaction} />
        </group>
      </Boundary>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={8} blur={2.4} far={3} />
      <Sparkles count={40} scale={[5, 3, 5]} position={[0, 1.6, 0]} size={2} speed={0.3} color="#f0abfc" />
    </>
  )
}

// Things you can't walk through while inside (x1, x2, z1, z2), padded by the body radius.
const BLOCKS = [[-0.85, 2.05, -2.8, -1.6], [-3, -2.3, 0.15, 1.65], [0.2, 1.0, -1.4, -0.6], [-2.55, -1.95, -2.6, -2.0], [2.1, 2.8, -2.7, -2.0], [-1.25, -0.55, -0.85, -0.15]]
const BODY = 0.25, MIN = -2.65, MAX = 2.65
const free = (x, z) => x > MIN && x < MAX && z > MIN && z < MAX
  && !BLOCKS.some(([x1, x2, z1, z2]) => x > x1 - BODY && x < x2 + BODY && z > z1 - BODY && z < z2 + BODY)

// First-person walking: drag to look, WASD / arrow keys to move, or click the floor to walk there.
function Walker({ walkTo }) {
  const { camera, gl } = useThree()
  const look = useRef({ yaw: 0.25, pitch: -0.08 })
  const keys = useRef({})
  const bob = useRef(0)
  useEffect(() => {
    camera.position.set(1.4, 1.6, 2.1)
    camera.fov = 68
    camera.rotation.order = 'YXZ'
    camera.updateProjectionMatrix()
    const el = gl.domElement
    let down = false
    const pd = (e) => { down = true; drag.x = e.clientX; drag.y = e.clientY; drag.moved = 0 }
    const pm = (e) => {
      if (!down) return
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y
      drag.moved += Math.abs(dx) + Math.abs(dy)
      drag.x = e.clientX; drag.y = e.clientY
      look.current.yaw -= dx * 0.0045
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - dy * 0.0035, -1.1, 0.9)
    }
    const pu = () => { down = false }
    const kd = (e) => {
      if (!/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(e.key)) return
      keys.current[e.key.toLowerCase()] = true
      walkTo.current = null
      e.preventDefault()
    }
    const ku = (e) => { keys.current[e.key.toLowerCase()] = false }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      el.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      drag.moved = 0
    }
  }, [camera, gl, walkTo])
  useFrame((_, dt) => {
    const k = keys.current, { yaw, pitch } = look.current
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x)
    const move = new THREE.Vector3()
    if (k.w || k.arrowup) move.add(fwd)
    if (k.s || k.arrowdown) move.sub(fwd)
    if (k.d || k.arrowright) move.add(right)
    if (k.a || k.arrowleft) move.sub(right)
    if (walkTo.current) {
      const to = new THREE.Vector3(walkTo.current.x - camera.position.x, 0, walkTo.current.z - camera.position.z)
      if (to.length() < 0.12) walkTo.current = null
      else move.add(to.normalize())
    }
    const p = camera.position
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(2.2 * Math.min(dt, 0.05))
      // slide along obstacles: try each axis on its own; a click-walk stops when it bumps into something
      const okX = free(p.x + move.x, p.z), okZ = free(p.x + (okX ? move.x : 0), p.z + move.z)
      if (okX) p.x += move.x
      if (okZ) p.z += move.z
      if (walkTo.current && !okX && !okZ) walkTo.current = null
      bob.current += dt * 9
    }
    p.y = 1.6 + Math.sin(bob.current) * 0.025
    camera.rotation.set(pitch, yaw, 0)
  })
  return null
}

// The overview: an outside camera with limited orbiting (restored when you leave walk mode).
function OutsideView({ position }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(...position)
    camera.fov = 38
    camera.rotation.order = 'XYZ'
    camera.updateProjectionMatrix()
  }, [camera, position])
  return (
    <OrbitControls target={[0, 1.2, -0.6]} enableZoom={false} enablePan={false}
      minAzimuthAngle={-0.15} maxAzimuthAngle={1.2} minPolarAngle={0.7} maxPolarAngle={1.45} enableDamping />
  )
}

export default function Room() {
  const wrap = useRef()
  const [visible, setVisible] = useState(false)
  const [lamp, setLamp] = useState(true)
  const [inside, setInside] = useState(false)
  const walkTo = useRef(null)
  const mobile = typeof window !== 'undefined' && window.innerWidth < 760
  const outsideCam = useMemo(() => (mobile ? [7.4, 5.3, 9.0] : [4.6, 3.4, 5.5]), [mobile])
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '200px' })
    io.observe(wrap.current)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const exit = () => setInside(false)
    window.addEventListener('room:exit', exit)
    return () => window.removeEventListener('room:exit', exit)
  }, [])
  useEffect(() => {
    if (!inside) return
    document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && setInside(false)
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc) }
  }, [inside])
  const toggleLamp = () => { setLamp((l) => !l) }
  const enter = () => { openWindow('room'); setInside(true); unlock('roomwalk') }
  useEffect(() => watchWindow('room', null, () => setInside(false)), [])
  return (
    <section className="block" id="room">
      <h2 className="reveal">Step into my <span>room</span></h2>
      <p className="reveal room-intro">My game development studio. Step inside and walk around, or click any object to explore.</p>
      {/* data-inside, not a class: React rewriting className would wipe the scroll-reveal's 'in' class */}
      <div className="room reveal" ref={wrap} data-inside={inside || undefined}>
        <Canvas frameloop={visible || inside ? 'always' : 'never'} dpr={[1, mobile ? 1.5 : 2]} camera={{ position: outsideCam, fov: 38 }}>
          <color attach="background" args={['#0d0714']} />
          <fog attach="fog" args={['#0d0714', 11, 20]} />
          <Suspense fallback={null}>
            <Scene lamp={lamp} toggleLamp={toggleLamp} inside={inside} onFloor={(pt) => { walkTo.current = pt }} />
          </Suspense>
          {inside ? <Walker walkTo={walkTo} /> : <OutsideView position={outsideCam} />}
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.75} />
          </EffectComposer>
        </Canvas>
        {inside ? (
          <>
            <button className="room-exit" onClick={() => setInside(false)}>✕ Leave room <small>Esc</small></button>
            <div className="room-hint" aria-hidden="true">
              {mobile ? 'Drag to look around · tap the floor to walk' : 'Drag to look · W A S D or arrow keys to walk · click the floor to walk there'}
            </div>
          </>
        ) : (
          <>
            <button className="room-enter" onClick={enter}>🚪 Step inside</button>
            <div className="room-hint" aria-hidden="true">Drag to look around · click any object</div>
          </>
        )}
      </div>
    </section>
  )
}
