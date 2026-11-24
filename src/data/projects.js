import media from './media.json' with { type: 'json' }

// Each hub is an orbit system. `icon` is a simple-icons slug resolved in src/data/icons.js.
export const hubs = [
  { id: 'unity', label: 'Unity', icon: 'unity', color: '#f0abfc', blurb: 'Gameplay, multiplayer and VR in C#' },
  { id: 'unreal', label: 'Unreal Engine', icon: 'unrealengine', color: '#c4b5fd', blurb: 'Endless runner and action games in Unreal' },
  { id: 'node', label: 'Node.js', icon: 'nodedotjs', color: '#86efac', blurb: 'Backends and full-stack web' },
  { id: 'three', label: 'Three.js', icon: 'threedotjs', color: '#f9a8d4', blurb: 'Interactive 3D on the web' },
  { id: 'cpp', label: 'C++', icon: 'cplusplus', color: '#93c5fd', blurb: 'Data structures and desktop tools' },
  { id: 'vr', label: 'VR', icon: 'oculus', color: '#fda4af', blurb: 'Meta Quest and immersive builds' },
]

// Trailers live at /videos/<id>.mp4 and posters at /posters/<id>.jpg (both optional).
const base = [
  {
    id: 'unbroken-oath', title: 'Unbroken Oath', hubs: ['unity'], year: '2026', badge: 'GameCon 2026 · 2nd Prize',
    summary: 'First-person shooter built by a team for GameCon 2026 at NED University.',
    detail: 'A first-person shooter developed in a team competition and awarded Second Prize at GameCon 2026.',
    stack: ['Unity', 'C#', 'FPS'], role: 'Game Developer (team)',
  },
  {
    id: 'mask-regime', title: 'Mask Regime', hubs: ['unity', 'node'], year: '2026', badge: 'Global Game Jam',
    summary: 'Real-time 2-player race-and-compete game made within the jam time limit.',
    detail: 'Built at Global Game Jam: a networked 2-player racing and competition game focused on real-time multiplayer.',
    stack: ['Unity', 'C#', 'Multiplayer'], role: 'Game Developer (jam team)',
  },
  {
    id: 'multiplayer-ludo', title: 'Multiplayer Ludo', hubs: ['unity', 'node'], year: '2026', badge: 'Freelance',
    summary: 'End-to-end multiplayer Ludo with a Node.js / Laravel backend.',
    detail: 'Delivered in a one-month freelance contract: the Unity front end plus a Node.js / Laravel backend for real-time multiplayer.',
    stack: ['Unity', 'C#', 'Node.js', 'Laravel'], role: 'Freelance Game & Backend Developer',
  },
  {
    id: 'escape-room-vr', title: 'Escape Room VR', hubs: ['unity', 'vr'], year: '2025',
    summary: 'VR puzzle experience: solve riddles to escape a locked room.',
    detail: 'A VR puzzle game built in Unity where players solve riddles to escape a locked room.',
    stack: ['Unity', 'C#', 'Meta Quest SDK'], role: 'Game Developer',
  },
  {
    id: 'abduction', title: 'Abduction', hubs: ['unity'], year: '2025',
    summary: '3D adventure: escape an asylum by solving puzzles and defeating enemies.',
    detail: 'A 3D adventure game in Unity (C#) where the player escapes an asylum by solving puzzles and defeating enemies.',
    stack: ['Unity', 'C#'], role: 'Game Developer',
  },
  {
    id: 'jumbo-jump', title: 'Jumbo Jump', hubs: ['unity'], year: '2024',
    summary: '2D platformer with coins, power-ups, enemies and a full health system.',
    detail: 'A 2D platformer in Unity (C#) featuring coins, power-ups, enemies and a complete health system.',
    stack: ['Unity', 'C#', '2D'], role: 'Game Developer',
  },
  {
    id: 'sunny-land', title: 'Sunny Land', hubs: ['unity'], year: '2024',
    summary: '2D platformer with smooth gameplay, coins and enemy avoidance.',
    detail: 'A 2D platformer in Unity (C#) with smooth movement, coin collection and enemy avoidance.',
    stack: ['Unity', 'C#', '2D'], role: 'Game Developer',
  },
  {
    id: 'car-racing', title: '3D Car Racing', hubs: ['unity'], year: '2026', badge: 'TreeObit Studios',
    summary: 'Core gameplay systems for a 3D racing game.',
    detail: 'Internship work at TreeObit Studios: environment integration, waypoint systems, game logic and win/loss conditions.',
    stack: ['Unity', 'C#'], role: 'Game Developer Intern',
  },
  {
    id: 'solitaire', title: 'Solitaire', hubs: ['unity'], year: '2026', badge: 'TreeObit Studios',
    summary: 'Card game built from scratch with multiple progressive levels.',
    detail: 'Built at TreeObit Studios with complete game logic across multiple progressive levels.',
    stack: ['Unity', 'C#'], role: 'Game Developer Intern',
  },
  {
    id: 'germ-endless-runner', title: 'Germ Endless Runner', hubs: ['unreal'], year: '2026',
    summary: 'Endless runner built in Unreal Engine — watch the trailer.',
    detail: 'An endless runner game made in Unreal Engine. Watch the trailer to see it in action.',
    stack: ['Unreal Engine'], role: 'Game Developer',
  },
  {
    id: 'spike-rush', title: 'Spike Rush', hubs: ['unreal'], year: '2026',
    summary: 'Fast-paced game built in Unreal Engine — watch the trailer.',
    detail: 'A fast-paced game made in Unreal Engine. Watch the trailer to see it in action.',
    stack: ['Unreal Engine'], role: 'Game Developer',
  },
  {
    id: 'ms-admission', title: 'MS Admission Dashboard', hubs: ['node'], year: '2025',
    summary: 'Full-stack system that automates graduate specialization assignment.',
    detail: 'HTML/CSS/JS front end with a PHP and MySQL backend and score-based logic that assigns specializations to applicants.',
    stack: ['HTML/CSS/JS', 'PHP', 'MySQL'], role: 'Full-stack developer',
  },
  {
    id: 'this-portfolio', title: 'This Portfolio', hubs: ['three'], year: '2026',
    summary: 'Interactive 3D portfolio with a rigged avatar and a RAG chatbot.',
    detail: 'React Three Fiber scene with a rigged avatar, orbiting project hubs, a retrieval-augmented chatbot and an email contact system.',
    stack: ['Three.js', 'React', 'Node.js', 'RAG'], role: 'Everything',
  },
  {
    id: 'snake-game', title: 'Snake (DSA)', hubs: ['cpp'], year: '2024',
    summary: 'Classic Snake driven by linked lists and queues.',
    detail: 'C++ implementation using data structures for efficient movement and collision handling.',
    stack: ['C++', 'DSA'], role: 'Developer',
  },
  {
    id: 'cyber-cafe', title: 'Cyber Cafe Management', hubs: ['cpp'], year: '2024',
    summary: 'Desktop GUI to manage users, time slots and billing.',
    detail: 'C++ and SFML desktop application handling user registration, session timing, billing and reports.',
    stack: ['C++', 'SFML'], role: 'Developer',
  },
]

// `video` is true only when a trailer exists in public/videos (list written by scripts/make-trailers.py).
export const projects = base.map((p) => ({ ...p, video: media.videos.includes(p.id) }))

export const projectsByHub = (hubId) => projects.filter((p) => p.hubs.includes(hubId))
