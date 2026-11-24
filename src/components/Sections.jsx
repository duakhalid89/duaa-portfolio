import { useMemo, useState } from 'react'
import { profile, skills, education, experience, achievements, community, certifications } from '../data/profile'
import { hubs, projects } from '../data/projects'
import { doMove } from '../lib/fx'
import { siGithub, siGmail } from 'simple-icons'
import LevelMap from './LevelMap'
import SkillPit from './SkillPit'
import { unlock } from '../lib/achievements'

export function About() {
  return (
    <section className="block" id="about">
      <h2 className="reveal">About <span>me</span></h2>
      <div className="about-grid">
        <div className="reveal">
          {profile.bio.map((t) => <p key={t.slice(0, 20)}>{t}</p>)}
          <div className="btn-row">
            {profile.cv.map((c) => <a key={c.href} className="btn" href={c.href} target="_blank" rel="noreferrer">⬇ {c.label}</a>)}
          </div>
        </div>
        <div className="about-side reveal">
          <figure className="photo">
            <img src="/profile-circle.webp" alt={`Portrait of ${profile.name}`} width="440" height="440" loading="lazy" />
          </figure>
          <div className="stats">
            {profile.stats.map((s) => (
              <div className="glass stat" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function Skills() {
  return (
    <section className="block" id="skills">
      <h2 className="reveal">Skills & <span>tech</span></h2>
      <SkillPit />
      <div className="skills-grid">
        {skills.map((s) => (
          <div className="glass reveal" key={s.group}>
            <h3>{s.group}</h3>
            <div className="chips">{s.items.map((i) => <span className="chip" key={i}>{i}</span>)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Gallery({ onOpenHub }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [view, setView] = useState('map')
  const list = useMemo(() => projects.filter((p) => {
    const inHub = filter === 'all' || p.hubs.includes(filter)
    const text = `${p.title} ${p.summary} ${p.stack.join(' ')}`.toLowerCase()
    return inHub && text.includes(q.trim().toLowerCase())
  }), [filter, q])
  return (
    <section className="block" id="projects">
      <h2 className="reveal">Projects & <span>achievements</span></h2>
      <div className="view-toggle reveal" role="tablist" aria-label="Project view">
        <button role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>🗺️ Map</button>
        <button role="tab" aria-selected={view === 'grid'} className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>▦ Grid</button>
      </div>
      <div className="gallery-tools reveal">
        <input type="search" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
        <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
        {hubs.map((h) => (
          <button key={h.id} className={`filter-btn${filter === h.id ? ' active' : ''}`} onClick={() => setFilter(h.id)}>{h.label}</button>
        ))}
      </div>
      {view === 'map' ? (
        <LevelMap visible={filter === 'all' && !q.trim() ? null : new Set(list.map((p) => p.id))} onOpen={onOpenHub} />
      ) : (
      <div className="proj-grid">
        {list.map((p) => (
          <button key={p.id} className="proj-card reveal" onClick={() => onOpenHub(filter !== 'all' ? filter : p.hubs[0], p.id)}>
            <div className="proj-thumb" style={{ backgroundImage: p.video ? `url(/posters/${p.id}.jpg), linear-gradient(135deg,#3b1c72,#a11d63)` : undefined }}>{p.video ? '' : p.title}{p.video && <span className="play" aria-hidden="true">▶</span>}</div>
            <div className="proj-body">
              {p.badge && <span className="badge">{p.badge}</span>}
              <h3>{p.title}{p.video && <span className="sr-only"> (trailer available)</span>}</h3>
              <p>{p.summary}</p>
              <div className="chips">{p.stack.slice(0, 3).map((s) => <span className="chip" key={s}>{s}</span>)}</div>
            </div>
          </button>
        ))}
        {!list.length && <p>No projects match that search.</p>}
      </div>
      )}
      <h3 style={{ margin: '3rem 0 1rem' }} className="reveal">Achievements</h3>
      <div className="ach-grid">
        {achievements.map((a) => (
          <div className="glass ach reveal" key={a.title}><h3 className="grad-text">{a.title}</h3><p>{a.detail}</p></div>
        ))}
      </div>
    </section>
  )
}

function Timeline({ items }) {
  return (
    <div className="timeline">
      {items.map((e) => (
        <div className="tl-item glass reveal" key={e.title + e.when}>
          <div className="tl-when">{e.when}</div>
          <h3>{e.title}</h3>
          <div className="tl-where">{e.where}</div>
          <p>{e.detail}</p>
        </div>
      ))}
    </div>
  )
}

export function Experience() {
  return (
    <section className="block" id="journey">
      <h2 className="reveal">Education & <span>experience</span></h2>
      <div className="two-col">
        <div>
          <Timeline items={experience} />
        </div>
        <div>
          <Timeline items={education} />
          <div className="glass reveal" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.7rem' }}>Certifications</h3>
            <div className="chips">{certifications.map((c) => <span className="chip" key={c}>{c}</span>)}</div>
          </div>
          <div className="glass reveal">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.7rem' }}>Community</h3>
            <div className="chips">{community.map((c) => <span className="chip" key={c}>{c}</span>)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

const empty = { name: '', email: '', subject: '', message: '', website: '' }

export function Contact() {
  const [f, setF] = useState(empty)
  const [errs, setErrs] = useState({})
  const [state, setState] = useState({ kind: 'idle', msg: '' })

  const validate = () => {
    const e = {}
    if (f.name.trim().length < 2) e.name = 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) e.email = 'Enter a valid email address.'
    if (f.subject.trim().length < 3) e.subject = 'Subject must be at least 3 characters.'
    if (f.message.trim().length < 10) e.message = 'Message must be at least 10 characters.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrs(e)
    if (Object.keys(e).length) return
    setState({ kind: 'sending', msg: '' })
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setState({ kind: 'ok', msg: "Message sent — thank you! I'll reply soon." })

      doMove('Victory')
      unlock('messenger')
      setF(empty)
    } catch (err) {
      setState({ kind: 'bad', msg: err.message })

    }
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const field = (k, label, type = 'text') => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      <input id={k} type={type} value={f[k]} onChange={set(k)} maxLength={k === 'subject' ? 120 : 100} aria-invalid={!!errs[k]} required />
      {errs[k] && <div className="err" role="alert">{errs[k]}</div>}
    </div>
  )

  return (
    <section className="block" id="contact">
      <h2 className="reveal">Let's <span>talk</span></h2>
      <p className="reveal" style={{ color: 'var(--muted)', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        Game jam, internship, freelance build — or just want to say hi. {profile.location}.
      </p>
      <div className="contact-links reveal">
        <a className="contact-btn" href={profile.links.github} target="_blank" rel="noreferrer" aria-label="GitHub (opens in a new tab)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={siGithub.path} /></svg>GitHub
        </a>
        <a className="contact-btn" href={profile.links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn (opens in a new tab)">
          <b aria-hidden="true">in</b>LinkedIn
        </a>
        <a className="contact-btn" href={`mailto:${profile.email}`} aria-label={`Email ${profile.email}`} title={profile.email}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={siGmail.path} /></svg>Gmail
        </a>
      </div>
      <form className="form glass reveal" onSubmit={submit} noValidate>
        {field('name', 'Your name')}
        {field('email', 'Email address', 'email')}
        {field('subject', 'Subject')}
        <div className="field">
          <label htmlFor="message">Message</label>
          <textarea id="message" value={f.message} onChange={set('message')} maxLength={3000} aria-invalid={!!errs.message} required />
          {errs.message && <div className="err" role="alert">{errs.message}</div>}
        </div>
        {/* honeypot: real visitors never see or fill this */}
        <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={f.website} onChange={set('website')} />
        <button className="btn primary" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'Sending…' : 'Send message'}</button>
        {state.kind === 'ok' && <div className="status ok" role="status">{state.msg}</div>}
        {state.kind === 'bad' && <div className="status bad" role="alert">{state.msg}</div>}
      </form>
    </section>
  )
}

export function Footer({ profile }) {
  return (
    <footer className="foot">
      <a href={`mailto:${profile.email}`}>{profile.email}</a> · <a href={profile.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> · <a href={profile.links.github} target="_blank" rel="noreferrer">GitHub</a>
      <div>© {new Date().getFullYear()} {profile.name}</div>
    </footer>
  )
}
