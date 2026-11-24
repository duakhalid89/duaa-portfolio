import nodemailer from 'nodemailer'
import { z } from 'zod'
import { rateLimit, readJson } from './_lib/limit.js'

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(3000),
  website: z.string().max(200).optional(), // honeypot
})

const oneLine = (s) => s.replace(/[\r\n]+/g, ' ')
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!rateLimit(req, 'contact', 3, 10 * 60_000)) return res.status(429).json({ error: 'Too many messages. Please try again in a few minutes.' })

  let body
  try { body = await readJson(req) } catch { return res.status(400).json({ error: 'Invalid request.' }) }

  // Honeypot: pretend success so bots learn nothing.
  if (body?.website) return res.status(200).json({ ok: true })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return res.status(400).json({ error: `Please check the "${issue.path[0]}" field.` })
  }
  const { name, email, subject, message } = parsed.data

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CONTACT_TO) return res.status(503).json({ error: 'Email is not configured yet.' })

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST, port: Number(SMTP_PORT) || 465, secure: (Number(SMTP_PORT) || 465) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    await transport.sendMail({
      from: `"Portfolio Contact" <${SMTP_USER}>`,
      to: CONTACT_TO,
      replyTo: { name: oneLine(name), address: email },
      subject: `[Portfolio] ${oneLine(subject)}`,
      text: `From: ${oneLine(name)} <${email}>\n\n${message}`,
      html: `<p><b>From:</b> ${esc(name)} &lt;${esc(email)}&gt;</p><p><b>Subject:</b> ${esc(subject)}</p><hr><p style="white-space:pre-wrap">${esc(message)}</p>`,
    })
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('contact error', err?.code, err?.message)
    res.status(502).json({ error: 'Could not send your message right now. Please email me directly.' })
  }
}
