import { siUnity, siUnrealengine, siNodedotjs, siThreedotjs, siCplusplus, siOculus, siBlender, siPython, siJavascript, siReact, siGit, siMysql, siPhp, siLaravel, siHtml5, siDotnet } from 'simple-icons'

const byslug = {
  unity: siUnity, unrealengine: siUnrealengine, nodedotjs: siNodedotjs, threedotjs: siThreedotjs, cplusplus: siCplusplus, oculus: siOculus,
  blender: siBlender, python: siPython, javascript: siJavascript, react: siReact, git: siGit, mysql: siMysql, php: siPhp,
  laravel: siLaravel, html5: siHtml5, dotnet: siDotnet,
}

const cache = new Map()

// Draws a glowing hologram badge for a hub icon and returns a canvas usable as a texture.
export function iconCanvas(slug, color, size = 512) {
  const key = `${slug}|${color}|${size}`
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const r = size / 2

  const bg = g.createRadialGradient(r, r, size * 0.05, r, r, r)
  bg.addColorStop(0, 'rgba(139,92,246,0.55)')
  bg.addColorStop(0.7, 'rgba(26,16,48,0.85)')
  bg.addColorStop(1, 'rgba(13,7,20,0)')
  g.fillStyle = bg
  g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.fill()

  g.lineWidth = size * 0.012
  g.strokeStyle = color
  g.shadowColor = color
  g.shadowBlur = size * 0.05
  g.beginPath(); g.arc(r, r, r * 0.86, 0, Math.PI * 2); g.stroke()

  const icon = byslug[slug]
  if (icon) {
    const s = (size * 0.46) / 24
    g.save()
    g.translate(r - 12 * s, r - 12 * s)
    g.scale(s, s)
    g.fillStyle = color
    g.shadowBlur = size * 0.04
    g.fill(new Path2D(icon.path))
    g.restore()
  } else {
    // no brand icon (e.g. C#): draw the slug as a glowing label instead
    g.fillStyle = color
    g.font = `bold ${size * 0.3}px "Space Grotesk", Arial, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(slug, r, r + size * 0.02)
  }
  cache.set(key, c)
  return c
}
