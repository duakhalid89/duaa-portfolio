import { useEffect, useRef, useState } from 'react'
import { canSpeak, doMove, isMuted, openWindow, say, setMuted, setThinking, stopSpeaking, subscribe, watchWindow } from '../lib/fx'
import { unlock } from '../lib/achievements'

const SUGGEST = ['What games has Duaa built?', 'Tell me about Unbroken Oath', 'Where did she intern?', 'What are her skills?']
const GREETING = { role: 'assistant', content: "Hi! I'm Duaa's AI assistant. Ask me about her games, skills, internships or education. You can ask in English or Urdu." }

// RPG-style typewriter: reveals the newest answer letter by letter; a click shows it all at once.
function TypeText({ text, live }) {
  const [n, setN] = useState(live ? 0 : text.length)
  useEffect(() => {
    if (n >= text.length) return
    const t = setTimeout(() => setN((x) => Math.min(text.length, x + 2)), 18)
    return () => clearTimeout(t)
  }, [n, text])
  const done = n >= text.length
  return (
    <span onClick={() => setN(text.length)} className="type">
      {text.slice(0, n)}{done ? <i className="more" aria-hidden="true">▼</i> : <i className="caret" aria-hidden="true" />}
    </span>
  )
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([GREETING])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const log = useRef()
  useEffect(() => subscribe((type, d) => { if (type === 'mute') setMutedState(d) }), [])
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  const send = async (q) => {
    const question = (q ?? text).trim()
    if (!question || busy) return
    const next = [...msgs, { role: 'user', content: question }]
    setMsgs(next)
    setText('')
    setBusy(true)
    setThinking(true)
    unlock('curious')

    if (/[؀-ۿ]|(aap|kya|hai|kahan|kaun)/i.test(question)) unlock('polyglot')
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING).map(({ role, content }) => ({ role, content })) }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Something went wrong.')
      setMsgs([...next, { role: 'assistant', content: data.answer, sources: data.sources }])

      setThinking(false)
      // grounded "I don't know" answers get a shrug before she reads them
      if (/don.?t have|not (mention|contain|available)|no information|معلومات نہیں|maloomat nahi/i.test(data.answer)) doMove('Shrug')
      say(data.answer) // the avatar plays her talking clip while the answer is read aloud
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: e.message }])

    } finally {
      setThinking(false)
      setBusy(false)
    }
  }

  const listen = () => {
    if (!SR || listening) return
    const rec = new SR()
    rec.lang = navigator.language || 'en-US'
    rec.onresult = (e) => { send(e.results[0][0].transcript) }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    stopSpeaking()
    setListening(true)
    rec.start()
  }

  useEffect(() => watchWindow('chat', null, () => { setOpen(false); stopSpeaking() }), [])
  const openChat = () => { openWindow('chat'); setOpen(true); doMove('Wave') }
  const closeChat = () => { setOpen(false); stopSpeaking() }
  if (!open) return <button className="chat-fab" onClick={openChat} aria-label="Open AI assistant">✦</button>

  return (
    <div className="chat" role="dialog" aria-label="AI assistant">
      <div className="chat-head">
        <b>Ask Duaa's AI</b>
        {canSpeak() && (
          <button onClick={() => setMuted(!muted)} aria-label={muted ? 'Read answers aloud' : 'Stop reading answers aloud'} title={muted ? 'Voice off' : 'Voice on'}>{muted ? '🔇' : '🔊'}</button>
        )}
        <button onClick={closeChat} aria-label="Close chat">✕</button>
      </div>
      <div className="chat-log" ref={log} aria-live="polite">
        {msgs.map((m, i) => m.role === 'user' ? (
          <div key={i} className="msg me">{m.content}</div>
        ) : (
          <div key={i} className="msg bot rpg">
            <img className="rpg-face" src="/profile-circle.webp" alt="" />
            <div className="rpg-box">
              <span className="rpg-name">Duaa · AI</span>
              <TypeText text={m.content} live={i === msgs.length - 1 && i > 0} />
            {m.sources?.length > 0 && (
              <div className="cites">
                {m.sources.map((s) => <a key={s.n} className="cite" href={s.anchor} onClick={() => setOpen(false)}>[{s.n}] {s.label}</a>)}
              </div>
            )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg bot rpg">
            <img className="rpg-face" src="/profile-circle.webp" alt="" />
            <div className="rpg-box"><span className="rpg-name">Duaa · AI</span><span className="dots">Thinking<i>.</i><i>.</i><i>.</i></span></div>
          </div>
        )}
      </div>
      {msgs.length === 1 && (
        <div className="suggest">{SUGGEST.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
      )}
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about my games…" maxLength={500} aria-label="Your question" />
        {SR && <button type="button" className={`mic${listening ? ' on' : ''}`} onClick={listen} aria-label="Speak your question">🎤</button>}
        <button disabled={busy}>Send</button>
      </form>
    </div>
  )
}
