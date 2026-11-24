// Shared "performance" layer: avatar moves, speech and sound effects, used by the hero, the companion,
// the chatbot, the tour and the contact form. One mute switch silences both voice and sound effects.

const listeners = new Set()
let muted = false
try { muted = localStorage.getItem('muted') === '1' } catch { /* ignore */ }

function emit(type, detail) { listeners.forEach((fn) => fn(type, detail)) }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }

/** Ask every avatar on the page to perform a Blender clip: 'Gamer' | 'Victory' | 'Shrug' | 'Point' | 'Wave'. */
export const doMove = (name) => emit('move', name)

/** Only one window is open at a time (chat, game, booth, room, universe, theatre): opening one closes the others. */
export const openWindow = (name) => emit('window', name)
/** Calls `onOpen` when `name` is opened and `onClose` when any other window opens. Returns an unsubscribe. */
export const watchWindow = (name, onOpen, onClose) =>
  subscribe((type, d) => { if (type !== 'window') return; if (d === name) onOpen?.(); else onClose?.() })
/** While true, avatars hold their "thinking" pose (the chatbot is working on an answer). */
export const setThinking = (on) => emit('thinking', on)

export const isMuted = () => muted
export function setMuted(m) {
  muted = m
  try { localStorage.setItem('muted', m ? '1' : '0') } catch { /* ignore */ }
  if (m) stopSpeaking()
  emit('mute', m)
}

// ---- speech (browser text-to-speech, free and offline-capable) ---------------------------------------------------
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
const URDU = /[؀-ۿ]/

function pickVoice(lang) {
  const voices = synth?.getVoices() || []
  if (lang === 'ur') return voices.find((v) => v.lang.startsWith('ur')) || voices.find((v) => v.lang.startsWith('hi'))
  // prefer a natural-sounding English female voice when the device has one
  return voices.find((v) => /en/i.test(v.lang) && /(female|zira|samantha|aria|jenny|google uk english female|libby|sonia)/i.test(v.name))
    || voices.find((v) => /en-(GB|US|IN)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang))
}

export const canSpeak = () => !!synth

let speakId = 0

/** Speak `text` aloud (citations and symbols stripped). Avatars play their talking clip while it lasts.
 *  Resolves when speech ends (immediately when muted or unsupported). Long text is spoken sentence by sentence,
 *  because Chrome silently stops utterances after ~15 s, and each sentence has a safety timeout in case the
 *  browser never reports the end. */
export function say(text) {
  if (!synth || muted || !text) return Promise.resolve()
  synth.cancel()
  const id = ++speakId
  const clean = text.replace(/\[\d+\]/g, '').replace(/[•*#_`]/g, ' ').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
  const lang = URDU.test(clean) ? 'ur' : 'en'
  const v = pickVoice(lang)
  const parts = clean.match(/[^.!?۔؟]+[.!?۔؟]*/g) || [clean]
  const speakOne = (part) => new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(part.trim())
    if (v) u.voice = v
    u.lang = v?.lang || (lang === 'ur' ? 'ur-PK' : 'en-GB')
    u.rate = 1.02
    u.pitch = 1.08
    const words = part.split(/\s+/).length
    const timer = setTimeout(resolve, 2500 + words * 600)
    u.onend = u.onerror = () => { clearTimeout(timer); resolve() }
    synth.speak(u)
  })
  return (async () => {
    emit('speaking', true)
    for (const part of parts) {
      if (id !== speakId || muted) break
      await speakOne(part)
    }
    if (id === speakId) emit('speaking', false)
  })()
}

export function stopSpeaking() { speakId++; synth?.cancel(); emit('speaking', false) }

// ---- sound effects (synthesised with Web Audio, no audio files) --------------------------------------------------
let ctx
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, start, dur, { type = 'sine', vol = 0.12, slide = 0 } = {}) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

const SOUNDS = {
  tick: () => tone(880, 0, 0.06, { type: 'triangle', vol: 0.05 }),
  open: () => { tone(520, 0, 0.12, { vol: 0.08 }); tone(780, 0.07, 0.14, { vol: 0.08 }) },
  close: () => { tone(700, 0, 0.1, { vol: 0.07 }); tone(470, 0.06, 0.12, { vol: 0.07 }) },
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, { type: 'triangle', vol: 0.09 })),
  error: () => { tone(300, 0, 0.18, { type: 'square', vol: 0.05 }); tone(220, 0.14, 0.24, { type: 'square', vol: 0.05 }) },
  pop: () => tone(620, 0, 0.09, { vol: 0.1, slide: 1.8 }),
  coin: () => { tone(988, 0, 0.07, { type: 'square', vol: 0.05 }); tone(1319, 0.06, 0.16, { type: 'square', vol: 0.05 }) },
  hit: () => tone(180, 0, 0.25, { type: 'sawtooth', vol: 0.07, slide: 0.4 }),
  whoosh: () => tone(300, 0, 0.35, { vol: 0.06, slide: 3 }),
}

export function sfx(name) {
  if (muted) return
  try { SOUNDS[name]?.() } catch { /* audio unavailable */ }
}
