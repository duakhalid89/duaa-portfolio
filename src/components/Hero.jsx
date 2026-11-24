import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Html, Sparkles, useAnimations, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { subscribe, say, doMove } from '../lib/fx'
import { unlock } from '../lib/achievements'
import { hubs } from '../data/projects'
import { iconCanvas } from '../data/icons'
import { profile } from '../data/profile'

useGLTF.preload('/models/avatar.glb')

const AVATAR_HEIGHT = 1.8

// Scarf recolouring. The outfit is a single texture, but the scarf is the only navy-blue fabric (the blazer and
// trousers are near-black), so the shader picks scarf pixels by how much bluer they are than red/green and re-tints
// them, keeping the fabric's shading. Shared by the hero avatar and the corner companion (they share the material).
export const SCARVES = [
  { name: 'Navy', color: null },
  { name: 'Orchid', color: '#c026d3' },
  { name: 'Rose', color: '#e11d48' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Gold', color: '#d97706' },
  { name: 'Lilac', color: '#8b5cf6' },
]
const scarfU = { uScarf: { value: new THREE.Color('#c026d3') }, uScarfMix: { value: 0 } }
try {
  const saved = SCARVES.find((x) => x.name === localStorage.getItem('scarf'))
  if (saved?.color) { scarfU.uScarf.value.set(saved.color); scarfU.uScarfMix.value = 1 }
} catch { /* ignore */ }
export function setScarf(sw) {
  try { localStorage.setItem('scarf', sw.name) } catch { /* ignore */ }
  if (sw.color) scarfU.uScarf.value.set(sw.color)
  gsap.to(scarfU.uScarfMix, { value: sw.color ? 1 : 0, duration: 0.6, delay: 0.35 })
  doMove('Spin')
}
function patchScarf(mat) {
  if (mat.userData.scarf) return
  mat.userData.scarf = true
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, scarfU)
    sh.fragmentShader = 'uniform vec3 uScarf;\nuniform float uScarfMix;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 c = diffuseColor.rgb;
        float ratio = c.b / (max(c.r, c.g) + 0.002);
        float m = smoothstep(1.55, 1.95, ratio) * step(0.006, c.b) * uScarfMix;
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(c, uScarf * clamp(lum * 9.0, 0.0, 1.0), m);
      }`)
  }
  mat.needsUpdate = true
}

export const WELCOME = "Hi, I'm Duaa Khalid, a game developer from Karachi. I build games in Unity and Unreal Engine. Pick a glowing icon to jump into my worlds, or ask my AI assistant anything!"
// What she says (and does) when a visitor taps her.
export const TAPS = [
  ['Gamer', 'Games are my favourite way to tell stories.'],
  ['Victory', 'Thank you for visiting my portfolio!'],
  ['Wave', 'Hello there!'],
  ['Point', 'Try clicking one of the glowing icons to explore my work.'],
  ['Shrug', 'Every bug is just a puzzle waiting to be solved.'],
]
let tapN = 0
export function tapReaction() {
  const [move, line] = TAPS[tapN++ % TAPS.length]
  unlock('hello')
  doMove(move)
  say(line)
  return line
}
const bone = (root, name) => root.getObjectByName(`mixamorig${name}`)

const _v = new THREE.Vector3()
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _q1 = new THREE.Quaternion()

// CCD solve for a short chain: rotate each joint (outermost first) so the effector lands on the target,
// then blend from the animated pose by `weight`.
function reachWith(chain, effector, target, weight) {
  const orig = chain.map((j) => j.quaternion.clone())
  for (let it = 0; it < 12; it++) {
    for (const joint of chain) {
      joint.updateWorldMatrix(true, true)
      // Work in the joint's own space: robust to mirrored/scaled rigs, unlike world-space quaternions.
      joint.worldToLocal(effector.getWorldPosition(_a)).normalize()
      joint.worldToLocal(_b.copy(target)).normalize()
      joint.quaternion.multiply(_q1.setFromUnitVectors(_a, _b))
    }
  }
  chain.forEach((j, i) => { const solved = j.quaternion.clone(); j.quaternion.copy(orig[i]).slerp(solved, weight) })
  chain[chain.length - 1].updateWorldMatrix(true, true)
}

/**
 * Procedural performance layered over the baked Blender clips (Idle loop plus Gamer, Think, Shrug, Victory, Talk and Point, played on
 * demand through lib/fx and blended back into Idle): pointer look-at, an IK wave,
 * and an arm IK reach + two-finger pinch toward the icon the visitor picks.
 * `pose` = { reach, pinch, wave } weights (0..1); `target.current` = world-space point the hand reaches for.
 */
export function Avatar({ pose, target, x = 0, scale = 1, copy = false, onTap }) {
  const group = useRef()
  const { scene: shared, animations } = useGLTF('/models/avatar.glb')
  // The corner companion needs its own skeleton, so it renders a clone of the loaded character.
  const scene = useMemo(() => (copy ? cloneSkinned(shared) : shared), [shared, copy])
  const { actions, mixer } = useAnimations(animations, group)
  const bones = useRef({})
  const snaps = useRef({})
  const gaze = useRef({ w: 0, last: -1e9 }) // how strongly she follows the pointer; only rises after the mouse actually moves
  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), e: new THREE.Euler(), wave: new THREE.Vector3(), front: new THREE.Vector3() }), [])
  const [fit, setFit] = useState({ s: 1, x: 0, y: 0, z: 0 })

  useEffect(() => {
    scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; patchScarf(o.material) } })
    const names = ['Head', 'Neck', 'Spine', 'Spine1', 'Spine2', 'RightArm', 'RightForeArm', 'RightHand',
      'RightHandMiddle1', 'RightHandMiddle2', 'RightHandRing1', 'RightHandRing2', 'RightHandPinky1', 'RightHandPinky2',
      'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3', 'RightHandThumb1', 'RightHandThumb2']
    names.forEach((n) => {
      bones.current[n] = bone(scene, n)
      snaps.current[n] = { base: new THREE.Quaternion(), out: new THREE.Quaternion(), ready: false }
    })
    const idle = actions.Idle
    idle?.reset().play()
    // Skinned-mesh bounds are unreliable, so measure the posed skeleton (head-top to toes) once the idle clip is applied.
    mixer.update(0)
    group.current.updateWorldMatrix(true, true)
    const a = new THREE.Vector3(), b = new THREE.Vector3(), h = new THREE.Vector3()
    // worldToLocal puts the points in the group's own space, so any earlier fit (effect re-runs) cancels out.
    group.current.worldToLocal(bone(scene, 'HeadTop_End').getWorldPosition(a))
    group.current.worldToLocal(bone(scene, 'LeftToe_End').getWorldPosition(b))
    group.current.worldToLocal(bone(scene, 'Hips').getWorldPosition(h))
    const s = AVATAR_HEIGHT / (a.y - b.y)
    setFit({ s, y: -b.y * s, x: -h.x * s, z: -h.z * s })
    return () => idle?.fadeOut(0.2)
  }, [scene, actions, mixer])

  // Blender clips on demand. One-shots (Point, Shrug, Victory) and Gamer (two loops) cross-fade in, then back to the
  // current base clip: Think while the chatbot is working, Talk while the voice speaks, otherwise Idle.
  // Wave is the procedural IK wave below.
  const moveW = useRef(0)
  useEffect(() => {
    const idle = actions.Idle
    if (!idle) return
    let current = null, speaking = false, thinking = false, base = idle
    const LOOPS = { Gamer: 2 }
    const pickBase = () => (thinking && actions.Think) || (speaking && actions.Talk) || idle
    const fade = (from, to, d) => {
      if (from === to) return
      to.reset().play()
      from.crossFadeTo(to, d, false)
    }
    const play = (name) => {
      if (name === 'Spin') { // a twirl to show off a new scarf colour
        // always land facing front, even if a twirl is already in progress
        const r = group.current.rotation
        gsap.killTweensOf(r)
        gsap.to(r, { y: (Math.round(r.y / (Math.PI * 2)) + 1) * Math.PI * 2, duration: 1.1, ease: 'power2.inOut' })
        return
      }
      if (name === 'Wave') {
        gsap.timeline().to(pose, { wave: 1, duration: 0.5, ease: 'power2.out' }).to(pose, { wave: 0, duration: 0.6, ease: 'power2.inOut' }, '+=1.4')
        return
      }
      const a = actions[name]
      if (!a || pose.reach > 0.05 || a === current) return
      a.setLoop(LOOPS[name] ? THREE.LoopRepeat : THREE.LoopOnce, LOOPS[name] || 1)
      a.clampWhenFinished = true
      fade(current || base, a, 0.35)
      current = a
    }
    const finished = (e) => {
      if (e.action !== current) return
      base = pickBase()
      fade(current, base, 0.45)
      current = null
    }
    const rebase = () => {
      const next = pickBase()
      if (next === base) return
      if (!current) fade(base, next, 0.35) // a playing one-shot hands over to the new base when it ends
      base = next
    }
    mixer.addEventListener('finished', finished)
    const off = subscribe((type, d) => {
      if (type === 'move') play(d)
      if (type === 'speaking') { speaking = d; rebase() }
      if (type === 'thinking') { thinking = d; rebase() }
    })
    return () => { off(); mixer.removeEventListener('finished', finished) }
  }, [actions, mixer, pose])

  useEffect(() => {
    const moved = () => { gaze.current.last = performance.now() }
    window.addEventListener('pointermove', moved)
    return () => window.removeEventListener('pointermove', moved)
  }, [])

  const add = (b, x, y, z, w = 1) => {
    if (!b) return
    tmp.q.setFromEuler(tmp.e.set(x * w, y * w, z * w))
    b.quaternion.multiply(tmp.q)
  }

  useFrame((state, delta) => {
    const B = bones.current
    if (!B.Head) return
    // The mixer only rewrites a bone when its clip value changes, so un-do last frame's layered offsets first:
    // if the bone still holds what we left, restore the clip pose; if the mixer wrote it, that is the new base.
    for (const n in B) {
      const b = B[n], sn = snaps.current[n]
      if (!b) continue
      if (sn.ready && b.quaternion.equals(sn.out)) b.quaternion.copy(sn.base)
      else sn.base.copy(b.quaternion)
      sn.ready = true
    }
    const t = state.clock.elapsedTime
    const { x: px, y: py } = state.pointer
    const w = Math.max(pose.reach, pose.wave)

    // Rest pose: chin level and still. She only looks toward the pointer while it is being moved, then settles back.
    const active = performance.now() - gaze.current.last < 2500 ? 1 : 0
    gaze.current.w = THREE.MathUtils.damp(gaze.current.w, active, active ? 4 : 1.6, delta)
    // gestures own the upper body, so the look-at fades out while one plays
    moveW.current = THREE.MathUtils.damp(moveW.current, ['Gamer', 'Shrug', 'Victory', 'Point', 'Think'].some((n) => actions[n]?.isRunning()) ? 1 : 0, 5, delta)
    const look = gaze.current.w * (1 - w * 0.5) * (1 - moveW.current)
    add(B.Neck, -py * 0.1 * look, px * 0.3 * look, 0)
    add(B.Head, -py * 0.12 * look, px * 0.4 * look, 0)
    add(B.Spine2, 0, px * 0.1 * look, 0)

    // right arm: IK toward the picked icon, or toward a point beside the shoulder while waving
    if (w > 0.002 && B.RightArm && B.RightHandMiddle1) {
      B.RightArm.getWorldPosition(_v)
      // hand beside the face with the elbow bent: raising the upper arm higher stretches her jacket's side panel
      tmp.wave.set(_v.x - 0.22 * scale + Math.sin(t * 9) * 0.06 * scale, _v.y + 0.12 * scale, _v.z + 0.3 * scale)
      const goal = tmp.wave.clone().lerp(_b.copy(target.current).add(tmp.front.set(0.03 * scale, 0, 0.1 * scale)), pose.reach)
      reachWith([B.RightForeArm, B.RightArm], B.RightHandMiddle1, goal, w)
      add(B.Spine2, 0.03, 0.08, 0, w)
      add(B.RightHand, 0, 0, Math.sin(t * 9) * 0.35, pose.wave * (1 - pose.reach))
    }

    // pinch: thumb and index meet, the other fingers curl loosely
    const p = pose.pinch
    if (p > 0.001) {
      add(B.RightHandIndex1, 0, 0, 0.7 * p)
      add(B.RightHandIndex2, 0, 0, 0.8 * p)
      add(B.RightHandIndex3, 0, 0, 0.4 * p)
      add(B.RightHandThumb1, 0.1 * p, 0.5 * p, 0)
      add(B.RightHandThumb2, 0, 0, 0.5 * p)
      for (const n of ['RightHandMiddle1', 'RightHandMiddle2', 'RightHandRing1', 'RightHandRing2', 'RightHandPinky1', 'RightHandPinky2']) add(B[n], 0, 0, 0.6 * p)
    }

    for (const n in B) if (B[n]) snaps.current[n].out.copy(B[n].quaternion)
  })

  return (
    <group position={[x, 0, 0]} scale={scale}>
      <group ref={group} scale={fit.s} position={[fit.x, fit.y, fit.z]}
        onClick={onTap && ((e) => { e.stopPropagation(); onTap() })}
        onPointerOver={onTap && (() => { document.body.style.cursor = 'pointer' })}
        onPointerOut={onTap && (() => { document.body.style.cursor = '' })}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

function useIconTexture(hub) {
  return useMemo(() => {
    const t = new THREE.CanvasTexture(iconCanvas(hub.icon, hub.color))
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [hub])
}

function HubIcon({ hub, angle, radius, dimmed, onPick, innerRef }) {
  const [hover, setHover] = useState(false)
  const tex = useIconTexture(hub)
  const mesh = useRef()
  useFrame((_, d) => {
    if (!mesh.current) return
    mesh.current.scale.setScalar(THREE.MathUtils.damp(mesh.current.scale.x, hover ? 1.28 : 1, 8, d))
    mesh.current.material.opacity = THREE.MathUtils.damp(mesh.current.material.opacity, dimmed ? 0 : 1, 6, d)
  })
  return (
    <group ref={innerRef} position={[Math.cos(angle) * radius, 1.2 + Math.sin(angle * 2) * 0.12, Math.sin(angle) * radius]}>
      <Billboard>
        <mesh
          ref={mesh}
          onClick={(e) => { e.stopPropagation(); if (!dimmed) onPick(hub.id) }}
          onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        >
          <planeGeometry args={[0.62, 0.62]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
        {hover && !dimmed && (
          <Html center position={[0, -0.5, 0]} zIndexRange={[5, 0]}>
            <div className="hub-label" style={{ position: 'static', transform: 'none' }}>{hub.label}</div>
          </Html>
        )}
      </Billboard>
    </group>
  )
}

function HubRing({ cx, radius, held, onPick, refs }) {
  const ring = useRef()
  useFrame((s, d) => { if (!held) ring.current.rotation.y += d * 0.22 })
  return (
    <group position={[cx, 0, 0]}>
      <group ref={ring}>
        {hubs.map((h, i) => (
          <HubIcon
            key={h.id}
            hub={h}
            angle={(i / hubs.length) * Math.PI * 2}
            radius={radius}
            dimmed={!!held}
            onPick={onPick}
            innerRef={(el) => { refs.current[h.id] = el }}
          />
        ))}
      </group>
    </group>
  )
}

// The icon the avatar is holding. Its position (in the anchor's space) is tweened by Rig, and the hand tracks it.
function HeldIcon({ hub, holdRef, size }) {
  const grp = useRef()
  const mesh = useRef()
  const tex = useIconTexture(hub)
  useFrame(() => {
    grp.current.position.copy(holdRef.current)
    mesh.current.scale.setScalar(size.current)
  })
  return (
    <group ref={grp}>
      <Billboard>
        <mesh ref={mesh}>
          <planeGeometry args={[0.62, 0.62]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  )
}

// If the avatar fails to download (flaky mobile data), keep the rest of the scene running without her.
class AvatarBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.warn('Avatar unavailable:', err.message) }
  render() { return this.state.failed ? null : this.props.children }
}

function Rig({ cx, radius, onEnter, mobile, cam }) {
  const [held, setHeld] = useState(null)
  const { camera } = useThree()
  const busy = useRef(false)
  const anchor = useRef()
  const refs = useRef({})
  const pose = useRef({ reach: 0, pinch: 0, wave: 0 })
  const hold = useRef(new THREE.Vector3())
  const size = useRef(1)
  const target = useRef(new THREE.Vector3())
  const scale = mobile ? 0.9 : 1

  // keep the world-space reach target glued to the held icon
  useFrame(() => {
    anchor.current.updateWorldMatrix(true, false)
    target.current.copy(hold.current).applyMatrix4(anchor.current.matrixWorld)
  })

  // greet on arrival
  useEffect(() => {
    const tl = gsap.timeline({ delay: 1.2 })
    tl.to(pose.current, { wave: 1, duration: 0.6, ease: 'power2.out' })
      .to(pose.current, { wave: 0, duration: 0.7, ease: 'power2.inOut' }, '+=1.8')
    return () => tl.kill()
  }, [])

  const pick = (id) => {
    if (busy.current) return
    busy.current = true
    anchor.current.updateWorldMatrix(true, false)
    refs.current[id].getWorldPosition(hold.current)
    anchor.current.worldToLocal(hold.current)
    size.current = 1
    setHeld(id)
    const tl = gsap.timeline()
    tl.to(pose.current, { reach: 1, wave: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
    // bring the icon to the avatar's right hand (screen left of her), then pinch it
    tl.to(hold.current, { x: cx - 0.3 * scale, y: 1.3 * scale, z: 0.38 * scale, duration: 0.9, ease: 'power2.inOut' }, 0.15)
    tl.to(size, { current: 0.75, duration: 0.6 }, 0.4)
    tl.to(pose.current, { pinch: 1, duration: 0.45, ease: 'power2.out' }, 1.0)
    // pull it toward the camera and fly in
    tl.to(hold.current, { x: 0, y: 1.4 * scale, z: 3.2, duration: 1.0, ease: 'power3.in' }, 1.6)
    tl.to(size, { current: 3.2, duration: 1.0, ease: 'power3.in' }, 1.6)
    // let go: the fingers open and the arm relaxes as the icon flies away
    tl.to(pose.current, { pinch: 0, duration: 0.25 }, 1.65)
    tl.to(pose.current, { reach: 0, duration: 0.8, ease: 'power2.inOut' }, 1.7)
    tl.add(() => onEnter(id), 2.4)
    tl.add(() => {
      busy.current = false
      setHeld(null)
      pose.current.reach = 0
      pose.current.pinch = 0
      camera.position.set(0, cam.y, cam.z)
    }, 3.1)
  }
  const heldHub = hubs.find((h) => h.id === held)
  return (
    <group ref={anchor}>
      <AvatarBoundary>
        <Avatar pose={pose.current} target={target} x={cx} scale={scale} onTap={busy.current ? undefined : tapReaction} />
      </AvatarBoundary>
      <HubRing cx={cx} radius={radius} held={held} onPick={pick} refs={refs} />
      {heldHub && <HeldIcon hub={heldHub} holdRef={hold} size={size} />}
    </group>
  )
}

function Floor({ cx }) {
  return (
    <group position={[cx, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0.9, 1.5, 2.2].map((r, i) => (
        <mesh key={r}>
          <ringGeometry args={[r, r + 0.012, 96]} />
          <meshBasicMaterial color={i % 2 ? '#8b5cf6' : '#ec4899'} transparent opacity={0.55 - i * 0.12} toneMapped={false} />
        </mesh>
      ))}
      <mesh>
        <circleGeometry args={[2.3, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.07} />
      </mesh>
    </group>
  )
}

// Points the camera at the middle of the scene whenever the layout changes.
function CameraSetup({ y, z, look }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, y, z)
    camera.lookAt(0, look, 0)
    camera.updateProjectionMatrix()
  }, [camera, y, z, look])
  return null
}

// The hero sky follows the visitor's local time; clicking the sun/moon cycles through the phases.
const SKIES = {
  dawn: { greet: 'Good morning', orb: '☀', key: '#ffe7d1', rim: '#f9a8d4', sky: '#ffd6e8', ground: '#3b1d5c', stars: 0.25 },
  day: { greet: 'Good afternoon', orb: '☀', key: '#ffffff', rim: '#93c5fd', sky: '#f2ecff', ground: '#3a2460', stars: 0.15 },
  sunset: { greet: 'Good evening', orb: '☀', key: '#ffd2a8', rim: '#f472b6', sky: '#ffc9b0', ground: '#3b1650', stars: 0.6 },
  night: { greet: 'Good evening', orb: '☾', key: '#fff4f9', rim: '#8b5cf6', sky: '#e6defa', ground: '#2a1250', stars: 1 },
}
const PHASES = ['dawn', 'day', 'sunset', 'night']
function skyFor(h) { return h >= 5 && h < 10 ? 'dawn' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'sunset' : 'night' }

export default function Hero({ onEnterHub, onReady }) {
  const [sky, setSky] = useState(() => skyFor(new Date().getHours()))
  const S = SKIES[sky]
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const f = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  const mobile = size.w < 860
  // Frame the whole avatar (feet to head) and the full icon ring for this screen shape.
  const cam = mobile ? { y: 1.9, z: 6.8, look: 1.9 } : { y: 1.2, z: 5.4, look: 1.15 }
  const halfH = cam.z * Math.tan(THREE.MathUtils.degToRad(17.5))
  const halfW = halfH * (size.w / Math.max(size.h, 620))
  const cx = mobile ? 0 : THREE.MathUtils.clamp(halfW * 0.42, 0.7, 1.8)
  const radius = mobile ? Math.min(1.35, halfW * 0.85) : Math.max(1.0, Math.min(1.9, halfW * 0.8 - cx))

  return (
    <section className="hero" id="home" aria-label="Introduction" data-sky={sky}>
      <div className="sky" aria-hidden="true" />
      <button className="sky-orb" onClick={() => { setSky(PHASES[(PHASES.indexOf(sky) + 1) % PHASES.length]) }}
        aria-label={`Sky: ${sky}. Change time of day`} title="Change the time of day">{S.orb}</button>
      <Canvas
        dpr={[1, mobile ? 1.5 : 2]}
        camera={{ position: [0, cam.y, cam.z], fov: 35 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={() => onReady?.()}
      >
        {/* soft sky/ground fill + a neutral key keep her outfit its true dark colour; violet rim separates her from the background */}
        <hemisphereLight args={[S.sky, S.ground, 0.7]} />
        <directionalLight position={[2, 4, 3]} intensity={1.5} color={S.key} />
        <directionalLight position={[-3, 2, -2]} intensity={1.1} color={S.rim} />
        <CameraSetup y={cam.y} z={cam.z} look={cam.look} />
        <group>
          <Suspense fallback={null}>
            <Rig cx={cx} radius={radius} onEnter={onEnterHub} mobile={mobile} cam={cam} />
          </Suspense>
          <Floor cx={cx} />
        </group>
        <Sparkles key={sky} count={Math.round((mobile ? 40 : 90) * S.stars) + 8} scale={[10, 5, 6]} position={[0, 2, 0]} size={3} speed={0.4} color="#f0abfc" />
        <EffectComposer multisampling={0}>
          {/* threshold sits above the lit avatar (white shirt, face, shoes) so only the neon icons and rings glow */}
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.72} />
        </EffectComposer>
      </Canvas>

      <div className="hero-copy">
        <div className="eyebrow">{S.greet} · {profile.role}</div>
        <h1>
          Hi, I'm <span className="grad-text">{profile.name.split(' ')[0]}</span>
        </h1>
        <p className="tag">{profile.tagline}</p>
        <p className="hook">{profile.hook}</p>
        <div className="btn-row">
          <a className="btn primary" href="#projects">See my games</a>
          <a className="btn" href="#reel">▶ Watch my reel</a>
          <a className="btn" href="#contact">Hire me</a>
        </div>
      </div>
      <div className="move-bar" role="group" aria-label="Avatar actions">
        <button onClick={() => { doMove('Wave'); say(WELCOME); unlock('hello') }}>👋 Say hi</button>
        <button onClick={() => { doMove('Gamer'); say('Game on!') }}>🎮 Game on</button>
        <button onClick={() => { doMove('Victory') }}>🏆 Victory</button>
        <button className="tour" onClick={() => window.dispatchEvent(new Event('tour:start'))}>🧭 Take the tour</button>
        <span className="swatches" role="group" aria-label="Scarf colour">
          <span aria-hidden="true">🧣</span>
          {SCARVES.map((sw) => (
            <button key={sw.name} className="swatch" style={{ '--sw': sw.color || '#1e3a6e' }} title={`${sw.name} scarf`} aria-label={`${sw.name} scarf`}
              onClick={() => { setScarf(sw) }} />
          ))}
        </span>
      </div>
      <div className="hero-hint">
        <b>Pick a glowing icon</b> to explore my work in that engine
      </div>
    </section>
  )
}
