"""Draws the architecture and RAG pipeline diagrams for the report (docs/report/figures/)."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figures')
os.makedirs(OUT, exist_ok=True)
F = lambda size, bold=False: ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf', size)
INK, MUTED, LINE = '#1f1235', '#5b5470', '#8b7bb0'


def box(d, xy, title, lines=(), fill='#efe7fb', edge='#6d28d9'):
    d.rounded_rectangle(xy, radius=18, fill=fill, outline=edge, width=3)
    x0, y0, x1, _ = xy
    d.text(((x0 + x1) / 2, y0 + 22), title, font=F(28, True), fill=INK, anchor='mt')
    for i, t in enumerate(lines):
        d.text(((x0 + x1) / 2, y0 + 66 + i * 34), t, font=F(23), fill=MUTED, anchor='mt')


def arrow(d, a, b, label=None, both=False):
    d.line([a, b], fill=LINE, width=4)
    import math
    def head(p, q):
        ang = math.atan2(q[1] - p[1], q[0] - p[0])
        for s in (2.6, -2.6):
            d.line([q, (q[0] + 18 * math.cos(ang + s), q[1] + 18 * math.sin(ang + s))], fill=LINE, width=4)
    head(a, b)
    if both:
        head(b, a)
    if label:
        d.text(((a[0] + b[0]) / 2 + 10, (a[1] + b[1]) / 2 - 30), label, font=F(21), fill=MUTED, anchor='lm')


# ---- architecture --------------------------------------------------------------------------------------------------
img = Image.new('RGB', (2000, 980), 'white')
d = ImageDraw.Draw(img)
box(d, (60, 60, 760, 330), 'Browser (visitor)', ['React single-page app', 'Three.js / React Three Fiber scenes', 'Avatar GLB + animation mixer',
                                                 'Chat window, contact form, games'])
box(d, (1000, 60, 1940, 240), 'Vercel static hosting', ['dist/: HTML, JS, CSS', 'models, videos, posters, CV'], fill='#fdf2f8', edge='#db2777')
box(d, (1000, 420, 1460, 640), '/api/chat', ['serverless function', 'retrieve top 5 chunks', 'build grounded prompt'])
box(d, (1520, 420, 1940, 640), '/api/contact', ['Zod validation', 'honeypot + rate limit', 'Nodemailer SMTP'])
box(d, (1000, 760, 1460, 930), 'Google Gemini API', ['embeddings + LLM'], fill='#ecfdf5', edge='#059669')
box(d, (1520, 760, 1940, 930), 'Gmail SMTP', ['delivers to my inbox'], fill='#ecfdf5', edge='#059669')
box(d, (60, 620, 760, 930), 'Build time (npm run build)', ['CV text + site data', 'chunk + embed (cached)', 'api/_data/index.json', 'Vite bundles the site'], fill='#fffbeb', edge='#d97706')
arrow(d, (760, 150), (1000, 150), 'page + assets', both=True)
arrow(d, (760, 290), (1000, 470), 'question / answer', both=True)
d.line([(760, 250), (1730, 250), (1730, 330)], fill=LINE, width=4)
arrow(d, (1730, 330), (1730, 420))
d.text((1300, 262), 'form data', font=F(21), fill=MUTED)
arrow(d, (1230, 640), (1230, 760), both=True)
arrow(d, (1730, 640), (1730, 760))
arrow(d, (760, 760), (1000, 600), 'index.json')
img.save(os.path.join(OUT, 'architecture.png'))

# ---- RAG pipeline --------------------------------------------------------------------------------------------------
img = Image.new('RGB', (2000, 760), 'white')
d = ImageDraw.Draw(img)
d.text((60, 30), 'Offline (when the site is built)', font=F(26, True), fill='#d97706')
steps = [('1. Collect', ['CV + site data', '34 documents']), ('2. Chunk', ['~700 chars', '100 overlap']),
         ('3. Embed', ['gemini-embedding-001', '768 dimensions']), ('4. Store', ['index.json', '46 vectors'])]
for i, (t, ls) in enumerate(steps):
    x = 60 + i * 480
    box(d, (x, 80, x + 400, 300), t, ls, fill='#fffbeb', edge='#d97706')
    if i < 3:
        arrow(d, (x + 400, 190), (x + 480, 190))
d.text((60, 380), 'Online (every question)', font=F(26, True), fill='#6d28d9')
steps = [('5. Embed question', ['same model', '(Urdu: translate first)']), ('6. Retrieve', ['cosine similarity', 'top 5 chunks']),
         ('7. Generate', ['Gemini + strict rules', 'answer only from chunks']), ('8. Show', ['answer + [n] citations', 'links to sections'])]
for i, (t, ls) in enumerate(steps):
    x = 60 + i * 480
    box(d, (x, 430, x + 400, 650), t, ls)
    if i < 3:
        arrow(d, (x + 400, 540), (x + 480, 540))
arrow(d, (1600, 300), (790, 430), 'searched')
img.save(os.path.join(OUT, 'rag-pipeline.png'))
print('diagrams done')
