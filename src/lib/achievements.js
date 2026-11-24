// Game-style achievements for visitors. Unlocks are remembered in this browser and announced with a toast.
import { doMove } from './fx'

export const ACHIEVEMENTS = [
  { id: 'hello', icon: '👋', title: 'First contact', desc: 'Said hi to Duaa' },
  { id: 'curious', icon: '💬', title: 'Curious mind', desc: 'Asked the AI assistant a question' },
  { id: 'polyglot', icon: '🌍', title: 'Polyglot', desc: 'Asked a question in Urdu' },
  { id: 'worlds', icon: '🪐', title: 'World hopper', desc: 'Jumped into a game world' },
  { id: 'explorer', icon: '🧭', title: 'Explorer', desc: 'Visited every section' },
  { id: 'roomwalk', icon: '🚪', title: 'Come on in', desc: 'Stepped inside Duaa’s room' },
  { id: 'trophy', icon: '🏆', title: 'Trophy hunter', desc: 'Found the trophy in Duaa’s room' },
  { id: 'photo', icon: '📸', title: 'Say cheese', desc: 'Took a photo in the photo booth' },
  { id: 'cinema', icon: '🍿', title: 'Movie night', desc: 'Watched the promo to the end' },
  { id: 'tourist', icon: '🎟️', title: 'Tourist', desc: 'Finished the guided tour' },
  { id: 'arcade', icon: '🖥️', title: 'Logged in', desc: 'Played games on Duaa’s computer' },
  { id: 'gamer', icon: '🎮', title: 'High scorer', desc: 'Scored 100+ in Code Catcher' },
  { id: 'nightowl', icon: '🌗', title: 'Night owl', desc: 'Switched the theme' },
  { id: 'messenger', icon: '✉️', title: 'Pen pal', desc: 'Sent Duaa a message' },
  { id: 'cheater', icon: '🕹️', title: 'Cheat code', desc: 'Found the secret code (hint: ↑↑↓↓…)' },
]

const KEY = 'achievements'
const listeners = new Set()
let got = new Set()
try { got = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { /* ignore */ }

export const unlocked = () => new Set(got)
export function onAchievement(fn) { listeners.add(fn); return () => listeners.delete(fn) }

export function unlock(id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id)
  if (!a || got.has(id)) return
  got.add(id)
  try { localStorage.setItem(KEY, JSON.stringify([...got])) } catch { /* ignore */ }

  listeners.forEach((fn) => fn(a, got.size))

  if (got.size === ACHIEVEMENTS.length) {
    setTimeout(() => { doMove('Victory') }, 900)
  }
}
