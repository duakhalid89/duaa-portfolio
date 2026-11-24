"""Builds docs/Duaa_Khalid_Portfolio_Report.pdf.

Run from the repository root:
    python docs/report/diagrams.py
    python docs/report/code_figures.py
    python docs/report/make_report.py
"""
import os
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, Image, KeepTogether, NextPageTemplate, PageBreak,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.path.join(ROOT, 'docs', 'screenshots')
FIGS = os.path.join(ROOT, 'docs', 'report', 'figures')
OUT = os.path.join(ROOT, 'docs', 'Duaa_Khalid_Portfolio_Report.pdf')
LIVE = 'https://duaa-portfolio-nu.vercel.app'
REPO = 'https://github.com/duakhalid89/duaa-portfolio'

FONTS = 'C:/Windows/Fonts/'
pdfmetrics.registerFont(TTFont('Times', FONTS + 'times.ttf'))
pdfmetrics.registerFont(TTFont('Times-B', FONTS + 'timesbd.ttf'))
pdfmetrics.registerFont(TTFont('Times-I', FONTS + 'timesi.ttf'))
pdfmetrics.registerFont(TTFont('Times-BI', FONTS + 'timesbi.ttf'))
pdfmetrics.registerFontFamily('Times', normal='Times', bold='Times-B', italic='Times-I', boldItalic='Times-BI')
pdfmetrics.registerFont(TTFont('Arial-B', FONTS + 'arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial', FONTS + 'arial.ttf'))
pdfmetrics.registerFont(TTFont('Mono', FONTS + 'consola.ttf'))
pdfmetrics.registerFont(TTFont('Mono-B', FONTS + 'consolab.ttf'))

BODY = ParagraphStyle('Body', fontName='Times', fontSize=12, leading=17, alignment=TA_JUSTIFY, spaceAfter=7)
BUL = ParagraphStyle('Bul', parent=BODY, leftIndent=18, bulletIndent=4, spaceAfter=4)
H1 = ParagraphStyle('H1', fontName='Times-B', fontSize=14, leading=18, spaceBefore=10, spaceAfter=8, keepWithNext=1)
H2 = ParagraphStyle('H2', fontName='Times-B', fontSize=12, leading=16, spaceBefore=8, spaceAfter=5, keepWithNext=1)
H3 = ParagraphStyle('H3', fontName='Times-B', fontSize=12, leading=16, spaceBefore=6, spaceAfter=4, keepWithNext=1)
FRONT = ParagraphStyle('Front', fontName='Times-B', fontSize=14, leading=18, alignment=TA_CENTER, spaceAfter=14)
CAP = ParagraphStyle('Cap', fontName='Times', fontSize=11, leading=14, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12)
TCAP = ParagraphStyle('TCap', fontName='Times', fontSize=11, leading=14, alignment=TA_CENTER, spaceBefore=4, spaceAfter=4, keepWithNext=1)
CELL = ParagraphStyle('Cell', fontName='Times', fontSize=10.5, leading=13)
CELLB = ParagraphStyle('CellB', parent=CELL, fontName='Times-B')

story = []
state = {'chapter': 0, 'sub': 0, 'fig': 0, 'table': 0}


def front(title): story.append(Paragraph(title, FRONT))
def p(text): story.append(Paragraph(text, BODY))
def bullets(items, marker='•'): story.extend(Paragraph(t, BUL, bulletText=marker) for t in items)
def lettered(items): story.extend(Paragraph(t, BUL, bulletText=f'{chr(97 + i)}.') for i, t in enumerate(items))
def numbered(items): story.extend(Paragraph(t, BUL, bulletText=f'{i + 1}.') for i, t in enumerate(items))


def h1(title):
    state['chapter'] += 1; state['sub'] = 0; state['table'] = 0
    story.append(Paragraph(f"{state['chapter']}. {title.upper()}", H1))


def h2(title, need=4 * cm):
    state['sub'] += 1; state['fig'] = 0
    story.append(CondPageBreak(need))  # never leave a heading alone at the bottom of a page
    story.append(Paragraph(f"{state['chapter']}.{state['sub']} {title}", H2))


def h3(num, title):
    story.append(Paragraph(f"{state['chapter']}.{state['sub']}.{num} {title}", H3))


def fig(path, caption, width=15.5 * cm, max_h=11 * cm):
    full = path if os.path.isabs(path) else (os.path.join(FIGS, path) if os.path.exists(os.path.join(FIGS, path)) else os.path.join(SHOTS, path))
    w, h = PILImage.open(full).size
    height = width * h / w
    if height > max_h:
        width, height = width * max_h / height, max_h
    state['fig'] += 1
    label = f"Fig. {state['chapter']}.{state['sub']}{state['fig']}"
    story.append(KeepTogether([Spacer(1, 4), Image(full, width=width, height=height), Paragraph(f'{label} {caption}', CAP)]))
    return label


def table(caption, rows, widths, head=True):
    state['table'] += 1
    data = [[Paragraph(str(c), CELLB if head and i == 0 else CELL) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
    st = [('GRID', (0, 0), (-1, -1), 0.6, colors.black), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
          ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
          ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]
    if head:
        st.append(('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ece6f6')))
    t.setStyle(TableStyle(st))
    story.append(Paragraph(f"Table {state['chapter']}.{state['table']} {caption}", TCAP))
    story.append(t)
    story.append(Spacer(1, 10))


class Mark(Flowable):
    """Invisible marker: tells the document where the numbered (arabic) pages start."""
    def __init__(self, name): super().__init__(); self.name = name
    def wrap(self, *a): return 0, 0
    def draw(self): pass


class Figures(TableOfContents):
    def notify(self, kind, stuff):
        if kind == 'TOFEntry':
            self.addEntry(*stuff)


def roman(n):
    out = ''
    for v, s in ((10, 'x'), (9, 'ix'), (5, 'v'), (4, 'iv'), (1, 'i')):
        while n >= v:
            out += s; n -= v
    return out


class Report(BaseDocTemplate):
    def beforeDocument(self):
        self.main_start = None

    def shown(self, page):
        return page - self.main_start + 1 if self.main_start else page

    def afterFlowable(self, f):
        if isinstance(f, Mark) and f.name == 'main':
            self.main_start = self.page
        if isinstance(f, Paragraph):
            name, text = f.style.name, f.getPlainText()
            if name == 'H1':
                self.notify('TOCEntry', (0, text, self.shown(self.page)))
            elif name == 'H2':
                self.notify('TOCEntry', (1, text, self.shown(self.page)))
            elif name == 'Cap':
                self.notify('TOFEntry', (0, text, self.shown(self.page)))


def footer_front(c, doc):
    c.saveState(); c.setFont('Times', 11)
    c.drawCentredString(A4[0] / 2, 1.3 * cm, roman(doc.page))
    c.restoreState()


def footer_main(c, doc):
    c.saveState(); c.setFont('Times', 11)
    c.drawRightString(A4[0] - 2.2 * cm, 1.3 * cm, f'{doc.page - doc.main_start + 1} | P a g e')
    c.restoreState()


# ---- the cover ---------------------------------------------------------------------------------------------------
def wire_sphere():
    """Vertices and edges of a once-subdivided icosahedron (a low-poly sphere)."""
    import math
    t = (1 + 5 ** 0.5) / 2
    v = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
         (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6),
         (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    norm = lambda q: tuple(x / math.sqrt(sum(y * y for y in q)) for x in q)
    v = [norm(q) for q in v]
    mid, faces = {}, []
    def m(i, j):
        k = tuple(sorted((i, j)))
        if k not in mid:
            v.append(norm(tuple((v[i][n] + v[j][n]) / 2 for n in range(3)))); mid[k] = len(v) - 1
        return mid[k]
    for a, b, c in f:
        ab, bc, ca = m(a, b), m(b, c), m(c, a)
        faces += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
    edges = {tuple(sorted(e)) for a, b, c in faces for e in ((a, b), (b, c), (c, a))}
    return v, edges


def cover(c, doc):
    import math
    W, H = A4
    c.saveState()
    top, bot = (0x0b, 0x06, 0x18), (0x24, 0x0f, 0x46)
    for i in range(120):
        t = i / 119
        c.setFillColorRGB(*[(top[k] + (bot[k] - top[k]) * t) / 255 for k in range(3)])
        c.rect(0, H - (i + 1) * H / 120, W, H / 120 + 1, fill=1, stroke=0)
    # faint dot grid
    c.setFillColor(colors.HexColor('#a78bfa'), alpha=0.10)
    for gx in range(0, int(W) + 1, 18):
        for gy in range(0, int(H) + 1, 18):
            c.circle(gx, gy, 0.6, fill=1, stroke=0)
    # glow behind the shape
    cx, cy, R = W * 0.68, H * 0.69, 118
    for k in range(16, 0, -1):
        c.setFillColor(colors.HexColor('#8b5cf6'), alpha=0.03)
        c.circle(cx, cy, R * 1.35 * k / 16, fill=1, stroke=0)
    # orbit rings
    c.setLineWidth(0.9)
    for rx, ry, col, a in ((R * 1.55, R * 0.42, '#ec4899', 0.55), (R * 1.3, R * 0.3, '#c4b5fd', 0.35)):
        c.setStrokeColor(colors.HexColor(col), alpha=a)
        c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, stroke=1, fill=0)
    # wireframe icosphere, rotated and drawn with depth-faded lines
    verts, edges = wire_sphere()
    ay, ax = 0.55, 0.38
    def proj(q):
        x, y, z = q
        x, z = x * math.cos(ay) + z * math.sin(ay), -x * math.sin(ay) + z * math.cos(ay)
        y, z = y * math.cos(ax) - z * math.sin(ax), y * math.sin(ax) + z * math.cos(ax)
        s = 3.2 / (3.2 - z)
        return cx + x * R * s, cy + y * R * s, z
    P = [proj(q) for q in verts]
    for i, j in sorted(edges, key=lambda e: P[e[0]][2] + P[e[1]][2]):
        depth = (P[i][2] + P[j][2]) / 2  # -1 back .. 1 front
        front = (depth + 1) / 2
        c.setStrokeColor(colors.HexColor('#f0abfc' if front > 0.5 else '#8b5cf6'), alpha=0.18 + 0.7 * front)
        c.setLineWidth(0.5 + 1.1 * front)
        c.line(P[i][0], P[i][1], P[j][0], P[j][1])
    for x, y, z in P:
        if z > 0.2:
            c.setFillColor(colors.HexColor('#fdf2ff'), alpha=0.85); c.circle(x, y, 1.6, fill=1, stroke=0)
    c.setFillAlpha(1); c.setStrokeAlpha(1)
    # header
    c.setFont('Mono-B', 8.5); c.setFillColor(colors.HexColor('#c4b5fd'))
    c.drawString(2 * cm, H - 2 * cm, 'NED UNIVERSITY OF ENGINEERING & TECHNOLOGY')
    c.drawRightString(W - 2 * cm, H - 2 * cm, 'FALL 2026')
    c.setStrokeColor(colors.HexColor('#c4b5fd'), alpha=0.35); c.setLineWidth(0.6)
    c.line(2 * cm, H - 2.35 * cm, W - 2 * cm, H - 2.35 * cm)
    c.setStrokeAlpha(1)
    # title block
    c.setFont('Mono-B', 10); c.setFillColor(colors.HexColor('#f472b6'))
    c.drawString(2 * cm, H - 15.2 * cm, 'PROJECT REPORT  /  CT-401')
    c.setFillColor(colors.white); c.setFont('Arial-B', 44)
    c.drawString(2 * cm, H - 17.0 * cm, 'Interactive 3D')
    c.drawString(2 * cm, H - 18.7 * cm, 'Web Portfolio')
    for i in range(60):  # gradient underline
        t = i / 59
        c.setFillColorRGB((0xec + (0x8b - 0xec) * t) / 255, (0x48 + (0x5c - 0x48) * t) / 255, (0x99 + (0xf6 - 0x99) * t) / 255)
        c.rect(2 * cm + i * 2.2, H - 19.35 * cm, 2.3, 3.2, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#d8ccf5')); c.setFont('Arial', 12)
    for i, line in enumerate(['3D graphics, a custom Blender avatar, an animated promo video,',
                              'a RAG-based AI chatbot and an email contact system.']):
        c.drawString(2 * cm, H - 20.3 * cm - i * 17, line)
    # details row
    y = 4.6 * cm
    c.setStrokeColor(colors.HexColor('#c4b5fd'), alpha=0.35); c.line(2 * cm, y + 1.2 * cm, W - 2 * cm, y + 1.2 * cm)
    c.setStrokeAlpha(1)
    cols = [('SUBMITTED BY', 'Duaa Khalid', 'Roll No. GA-23303'), ('COURSE', 'Web 3D Programming', 'CT-401'),
            ('COURSE ADVISOR', 'Miss Saadia Arshad', 'Fall Semester 2026')]
    colw = (W - 4 * cm) / 3
    for i, (k, v1, v2) in enumerate(cols):
        x = 2 * cm + i * colw
        c.setFont('Mono', 7.5); c.setFillColor(colors.HexColor('#f0abfc')); c.drawString(x, y + 0.45 * cm, k)
        c.setFont('Arial-B', 12.5); c.setFillColor(colors.white); c.drawString(x, y - 0.15 * cm, v1)
        c.setFont('Arial', 10); c.setFillColor(colors.HexColor('#d8ccf5')); c.drawString(x, y - 0.75 * cm, v2)
    c.setFont('Arial', 9.5); c.setFillColor(colors.HexColor('#c4b5fd'))
    c.drawString(2 * cm, 2.6 * cm, 'Department of Computer Science & Information Technology')
    c.setFont('Mono', 8); c.setFillColor(colors.HexColor('#f0abfc'))
    c.drawString(2 * cm, 1.6 * cm, LIVE.replace('https://', ''))
    c.drawRightString(W - 2 * cm, 1.6 * cm, REPO.replace('https://', ''))
    c.restoreState()


# =====================================================================================================================
story.append(NextPageTemplate('front'))
story.append(PageBreak())

front('ABSTRACT')
p('This report explains the design and development of my personal portfolio website, an interactive 3D site that '
  'presents my profile, skills, game projects, education and achievements. The site was built for the course Web 3D '
  'Programming (CT-401) and brings together five pieces of work: a responsive 3D website, a custom avatar of myself '
  'prepared in Blender, a short promotional video made in Adobe After Effects, an AI chatbot that answers questions '
  'about me using Retrieval-Augmented Generation (RAG), and a contact form that delivers messages to my email.')
p('The front end is written in React, and the 3D parts use Three.js through React Three Fiber. The avatar is a rigged '
  'GLB model with seven animation clips that I keyed in Blender with a Python script, and it reacts to what the visitor '
  'does on the page. The chatbot splits my CV and portfolio data into 46 chunks, turns them into embeddings with '
  'Google Gemini, finds the closest chunks for each question and asks the language model to answer only from them, '
  'with citations. The contact system validates input in the browser and again on the server, protects the email '
  'password with environment variables and uses a honeypot and rate limit against spam.')
p('Because I specialise in game development, the site is designed to feel like a small game: visitors can walk inside '
  'a 3D studio room, open my games on the computer, play three mini-games and unlock achievements. The site is '
  f'deployed on Vercel at {LIVE.replace("https://", "")} and every part listed in the project brief was tested on the '
  'live version.')
story.append(PageBreak())

front('TABLE OF CONTENTS')
toc = TableOfContents()
toc.levelStyles = [ParagraphStyle('T0', fontName='Times-B', fontSize=12, leading=16, leftIndent=0, firstLineIndent=0),
                   ParagraphStyle('T1', fontName='Times', fontSize=12, leading=15, leftIndent=18, firstLineIndent=0)]
toc.dotsMinLevel = 0
story.append(toc)
story.append(PageBreak())

front('LIST OF FIGURES')
lof = Figures()
lof.levelStyles = [ParagraphStyle('F0', fontName='Times', fontSize=11.5, leading=15, leftIndent=0, firstLineIndent=0)]
lof.dotsMinLevel = 0
story.append(lof)

story.append(NextPageTemplate('main'))
story.append(PageBreak())
story.append(Mark('main'))

# ---- 1. INTRODUCTION -------------------------------------------------------------------------------------------------
h1('Introduction')
p('A portfolio is usually the first thing a recruiter or a teacher sees of a student\'s work. For a game developer a '
  'plain list of projects does not say much, because the interesting part of a game is how it feels to use. The idea '
  'behind this project was to make a portfolio that behaves a bit like one of my games: something you can explore, '
  'click on and play with, while still being quick to read for someone who only wants the facts.')
p('The project covers the full path from a 3D model to a deployed web application. It includes preparing and '
  'animating a 3D character, making a video, building a small search-and-answer system on top of a language model, '
  'writing a secure backend for email, and putting everything online.')

h2('Objective')
p('The aim of this project is to design and develop a modern, interactive 3D portfolio website. The website should:')
numbered(['show my name, introduction, profile, skills, projects, achievements, education and experience in a clear order;',
          'use interactive 3D graphics, including a custom avatar prepared in Blender and shown with animation;',
          'embed a 30 to 60 second promotional video made in Adobe After Effects;',
          'include a chatbot that answers questions about me only from my own documents and does not invent information;',
          'let visitors send me a message through a validated, spam-protected contact form;',
          'work on desktop, tablet and mobile and be deployed online with documentation.'])

h2('Theory')
p('<b>3D on the web.</b> WebGL lets the browser draw 3D graphics with the computer\'s graphics card. Three.js is a '
  'library that hides most of the low-level WebGL code behind objects such as scenes, cameras, lights, meshes and '
  'materials. React Three Fiber lets these Three.js objects be written as React components, so the 3D scenes can share '
  'state with the rest of the page.')
p('<b>glTF and GLB.</b> glTF is an open format for 3D scenes made by the Khronos Group, often called the "JPEG of 3D". '
  'GLB is its single-file binary version. One GLB file can hold the mesh, textures, the skeleton (armature) and the '
  'animation clips, which makes it a good fit for the web [1].')
p('<b>Skinning and animation.</b> A rigged character has a skeleton of bones. Every vertex of the mesh is linked to one '
  'or more bones with a weight, so when a bone rotates the vertices follow it. Animation clips store bone rotations '
  'over time, and the Three.js animation mixer can play and blend these clips.')
p('<b>Retrieval-Augmented Generation.</b> A large language model on its own may guess when it does not know something. '
  'RAG reduces this by first retrieving the most relevant passages from a trusted set of documents and then asking the '
  'model to answer from those passages only [2]. Text is compared using embeddings: lists of numbers that place '
  'sentences with similar meaning close together, so similarity can be measured with the cosine of the angle between '
  'two vectors [3].')
p('<b>Email from a website.</b> A browser cannot send email directly. The form sends its data to a server function, '
  'which checks it and passes it to an SMTP server (Gmail in this project) using credentials that are never sent to '
  'the browser.')

h2('Tools and Technologies')
p('The list of tools and technologies used is as below:')
lettered(['Front end: React 19 and Vite, with plain CSS for the design (dark and light themes)',
          '3D: Three.js, React Three Fiber, Drei helpers, post-processing (bloom) and GSAP for timing animations',
          '3D modelling and animation: Blender 5.2, scripted with Python (bpy), export to GLB with Draco compression',
          'Video: Adobe After Effects (project file and render), FFmpeg for the smaller web version',
          'AI: Google Gemini for embeddings (gemini-embedding-001) and answers (Gemini Flash models)',
          'Backend: Vercel serverless functions in Node.js, Zod for validation, Nodemailer for SMTP email',
          'Browser APIs: Web Speech (voice input and spoken answers), Web Audio (game sounds), Canvas 2D (mini-games)',
          'Hosting and version control: Vercel, Git and GitHub',
          'Editor and platform: Visual Studio Code on Windows, tested in Chrome and Edge'])

h2('System Architecture')
p('The website is a single-page application. Vercel serves the built files (HTML, JavaScript, CSS, the avatar model, '
  'videos and images). Two serverless functions handle the parts that need secrets: /api/chat for the chatbot and '
  '/api/contact for email. The chatbot\'s vector index is created when the site is built and is deployed together with '
  'the chat function, so no separate database server is needed.')
fig('architecture.png', 'Architecture of the portfolio')
fig('01-home.jpg', 'Home page with the 3D avatar and the ring of skill icons')

# ---- 2. LITERATURE REVIEW --------------------------------------------------------------------------------------------
h1('Literature Review')
p('Interactive 3D portfolios have become common among designers and developers since WebGL became available in all '
  'major browsers. Libraries such as Three.js made it practical to show real 3D models on a normal web page without '
  'plugins [4]. The usual pattern is a 3D hero scene on top of a normal scrolling page, which keeps the content '
  'readable while giving the first impression a strong visual identity. React Three Fiber builds on this by letting 3D '
  'scenes be written as React components [5].')
p('For 3D assets on the web, the glTF 2.0 format by the Khronos Group is now the standard way to deliver models, '
  'because it is designed to be loaded directly by real-time engines with little processing [1]. Mesh compression '
  'such as Google\'s Draco reduces file sizes a lot, which matters for visitors on mobile data.')
p('Retrieval-Augmented Generation was introduced by Lewis et al. [2], who combined a neural retriever with a text '
  'generator so that answers could be based on documents instead of only on what the model had memorised. Dense '
  'retrieval, where passages and questions are compared as embedding vectors, was shown by Karpukhin et al. to work '
  'better than keyword search for open questions [3]. A known problem of language models is hallucination, where the '
  'model produces fluent but false statements [6]. Grounding the answer in retrieved passages, asking the model to '
  'cite them and allowing it to say "I don\'t know" are common ways to reduce this, and all three are used in this '
  'project.')
p('For contact forms, the OWASP guidance on input validation recommends checking all input on the server even when it '
  'was already checked in the browser, since browser checks can be skipped [7]. Honeypot fields and rate limits are '
  'simple ways to stop most automated spam without making real visitors solve a CAPTCHA.')

# ---- 3. METHODOLOGY --------------------------------------------------------------------------------------------------
h1('Proposed Methodology & Implementation')
p('Below is the discussion of how each part of the portfolio was built, followed by the main programming and 3D '
  'concepts used, with screenshots of the real code.')

h2('Assumptions')
lettered(['Visitors use a modern browser with WebGL (any recent version of Chrome, Edge, Firefox or Safari).',
          'The chatbot only knows what is written in my CV and in the portfolio data, so anything else is answered with '
          '"I don\'t have that information".',
          'The free tier of the Gemini API is enough for the expected number of visitors; if it is busy, the chatbot '
          'shows a friendly message instead of failing.',
          'Voice features depend on the visitor\'s browser and installed voices, and browsers only allow speech after the '
          'visitor has clicked once on the page.',
          'The base mesh of the avatar was generated from my photo with an AI tool and then prepared in Blender; '
          'modelling a full character from scratch was outside the time available.'])

h2('Implementation')
h3(1, 'Website structure and flow')
p('The page is one long story that goes from who I am to how to contact me. Every section is reachable from the '
  'navigation bar, and smooth scrolling and short reveal animations connect them. Table 3.1 lists the sections in '
  'order.')
table('Sections of the website', [
    ['Section', 'What it shows', 'Interaction'],
    ['Home', 'Name, short introduction, 3D avatar and skill icons', 'Click an icon to open that engine\'s projects; avatar buttons'],
    ['About', 'Biography, photo, key numbers, CV download', 'Download the CV'],
    ['Reel', 'Promotional video', 'Chapters, theatre mode'],
    ['Room', '3D studio room', 'Click objects; step inside and walk around'],
    ['Skills', 'Skill groups and a physics "ball pit" of skill logos', 'Grab and throw the balls'],
    ['Projects', 'Projects as a level map or a grid, and achievements', 'Filter, search, open trailers and details'],
    ['Journey', 'Internships, freelance work, education, certifications', 'Read'],
    ['Contact', 'GitHub, LinkedIn and Gmail buttons, contact form', 'Send a message'],
], [2.4 * cm, 7.2 * cm, 6.4 * cm])
p('Early versions had too many things popping up at the same time. To keep the flow calm I added one rule: only one '
  'window can be open at a time. The chat, the games, the photo booth, the room walk mode, a project world and the '
  'video\'s theatre mode all announce themselves when they open, and whatever was open before closes (Fig. 3.35). The '
  '3D room also works as a hub: its computer opens the games, a camera on the desk opens the photo booth and the '
  'trophy leads to my achievements.')

h3(2, '3D scenes')
bullets(['<b>Hero scene:</b> the avatar stands on a glowing floor with a rotating ring of skill icons. The head follows '
         'the mouse, and clicking an icon makes the avatar reach for it with inverse kinematics, pinch it and pull the '
         'visitor into a 3D "universe" of projects for that engine. The sky changes with the visitor\'s local time.',
         '<b>Studio room:</b> a game developer\'s room built from Three.js primitives (desk, monitor, chair, bookshelf, '
         'lamp, plant, trophy, posters, neon sign). Every object is clickable. "Step inside" switches to a first-person '
         'view where the visitor can look around by dragging and walk with W A S D or by clicking the floor, with simple '
         'collision against the furniture.',
         '<b>Skill ball pit:</b> sixteen balls with skill logos fall into a box. I wrote the physics myself (gravity, '
         'bouncing, ball-to-ball collisions) so no physics library was needed.',
         '<b>Performance:</b> each 3D canvas only renders while it is on screen, and the avatar model was compressed '
         'from 7.5 MB to about 1.35 MB.'])
fig('05-room.jpg', 'The 3D studio room; each object leads to a part of the portfolio')

h3(3, '3D avatar in Blender')
p('The avatar represents me: hijab, glasses, blazer and wide trousers. The base mesh and rig were generated from my '
  'photo with an AI 3D tool (Meshy AI). I then did the remaining work in Blender 5.2, recorded step by step in the '
  'script blender/build_avatar.py so that the whole build can be repeated:')
numbered(['import the rigged base model and tidy the scene and names;',
          'adjust the outfit material to a matte fabric so the black clothes keep their colour on the website;',
          'fix the skin weights of the blazer (explained in Section 3.4), because the auto-rig had attached the jacket '
          'to the arm bones and it stretched like a wing when the arms moved;',
          'pose the character in a relaxed standing pose and key seven animation clips (Table 3.2);',
          'add a camera, three-point lighting and a floor for previews, save avatar.blend and export the GLB with 1024 px '
          'textures and Draco compression.'])
table('Animation clips made in Blender', [
    ['Clip', 'Length', 'When it plays on the website'],
    ['Idle', '4 s loop', 'Always: breathing, weight shift, small head and arm sway'],
    ['Talk', '3 s loop', 'While an answer is read aloud'],
    ['Think', '4 s loop', 'While the chatbot is preparing an answer'],
    ['Shrug', '2 s', 'When the chatbot does not have the information'],
    ['Gamer', '3 s loop', 'When the games are opened or "Game on" is pressed'],
    ['Victory', '2.3 s', 'Trophy click, correct answers, sent messages'],
    ['Point', '2.7 s', 'Guided tour and section changes'],
], [2.4 * cm, 2.4 * cm, 11.2 * cm])
fig('28-blender-avatar-animations.jpg', 'Blender renders of the seven clips: Idle, Talk, Think, Shrug, Gamer, Victory, Point')

h3(4, 'Promotional video in After Effects')
p('The 35-second video introduces me and my work. It is built from eight compositions (scenes) in After Effects, '
  'with neon cards, a particle background, slide and scale transitions, and the gameplay trailers of my games. The '
  'project file is after-effects/Duaa_Promo.aep, the scene layout script is after-effects/build/build_promo.jsx and '
  'the final 1080p render is after-effects/render/Duaa_Khalid_Promo.mp4.')
table('Scenes of the promo video', [
    ['Time', 'Scene'],
    ['0:00', 'Intro with a typed line'],
    ['0:04.8', '"Hello, I am Duaa" card with my photo and the tools I use'],
    ['0:10', 'Featured games: Unbroken Oath, Mask Regime, Abduction, Escape Room VR'],
    ['0:14.6', 'More builds: other game clips'],
    ['0:19', 'Achievements: GameCon second prize, Global Game Jam, 10+ games'],
    ['0:23.6', 'Profile card with numbers and strengths'],
    ['0:31.3', 'End card with my name, role and website'],
], [2.4 * cm, 13.6 * cm])
p('The music is "Voxel Revolution" by Kevin MacLeod, used under the Creative Commons Attribution 4.0 licence [8]. The '
  'credit is shown in the video\'s end card and under the player on the website. The website plays a 720p copy '
  '(3.8 MB instead of 21.7 MB) in a custom player with chapter buttons that match the scene times and a theatre mode '
  'that darkens the page.')
fig('27-after-effects-frames.jpg', 'Frames from the rendered promo video')
fig('03-promo.jpg', 'The promo video embedded on the website')

h3(5, 'RAG chatbot')
p('The chatbot follows the pipeline in Fig. 3.25. The first four steps run once when the site is built; the last four '
  'run for every question.')
table('Settings of the RAG pipeline', [
    ['Step', 'Setting used'],
    ['Documents', '34 documents: CV text plus profile, skills, education, experience, achievements, certifications and every project'],
    ['Chunking', 'Split on paragraphs, merged to about 700 characters with about 100 characters of overlap (46 chunks)'],
    ['Embeddings', 'gemini-embedding-001, 768 dimensions; unchanged chunks reuse their stored vectors'],
    ['Vector index', 'api/_data/index.json, deployed with the serverless function'],
    ['Retrieval', 'Cosine similarity, top 5 chunks; keyword (TF-IDF) search if the embedding API is unavailable'],
    ['Generation', 'Gemini Flash-Lite, temperature 0, with fallback models and one retry if the service is busy'],
    ['Languages', 'Understands English, Roman Urdu and Urdu script (Urdu questions are translated for searching); always answers in English'],
], [3 * cm, 13 * cm])
p('Each answer appears in a game-style dialogue box with clickable source labels that scroll to the matching section '
  'of the page. Visitors can also ask by voice and hear the answer read aloud.')
fig('rag-pipeline.png', 'RAG pipeline used by the chatbot')

h3(6, 'Email and contact system')
table('How the contact system meets the requirements', [
    ['Requirement', 'Implementation'],
    ['Form fields', 'Name, email address, subject and message'],
    ['Frontend validation', 'Checked before sending; each field shows its own message'],
    ['Backend validation', 'Checked again on the server with a Zod schema (lengths and email format)'],
    ['Delivery', 'Nodemailer sends the message through Gmail SMTP to my inbox; the visitor\'s address is set as Reply-To'],
    ['Messages to the user', '"Message sent, thank you!" on success; a clear error message on failure'],
    ['Secrets', 'SMTP user, app password and recipient only in environment variables (.env locally, Vercel settings online)'],
    ['Spam protection', 'Hidden honeypot field, at most 3 messages per IP every 10 minutes, 20 KB body limit'],
    ['Safe input handling', 'Input is HTML-escaped in the email and line breaks are removed from header fields'],
], [3.8 * cm, 12.2 * cm])

h3(7, 'Deployment')
p(f'The repository is on GitHub ({REPO.replace("https://", "")}) and connected to Vercel. Every push to the main '
  'branch rebuilds and redeploys the site automatically. The build command first updates the chatbot index and then '
  'builds the site with Vite. The environment variables GEMINI_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and '
  'CONTACT_TO are set in the Vercel project settings and are never committed.')

h2('Web and 3D Concepts Used')
p('The main programming concepts used in the project are explained below, with screenshots of the actual code where '
  'each one is used.')
bullets(['<b>Chunking with overlap:</b> paragraphs are merged until a chunk reaches about 700 characters, and the last '
         '100 characters are carried into the next chunk so that a fact split across a boundary is not lost (Fig. 3.31).'])
fig('code-chunking.png', 'Splitting the documents into chunks (scripts/build-index.js)')
bullets(['<b>Vector search:</b> the question is embedded, every chunk is scored with cosine similarity and the five best '
         'are kept. If the embedding call fails, a keyword search is used so the chatbot keeps working (Fig. 3.32).'])
fig('code-retrieve.png', 'Retrieval with a keyword fallback (api/_lib/rag.js)')
bullets(['<b>Grounded prompting:</b> the system prompt tells the model to answer only from the numbered passages, never '
         'to invent facts, to cite passages and to always answer in English (Fig. 3.33).'])
fig('code-prompt.png', 'Rules given to the language model (api/chat.js)')
bullets(['<b>Server-side validation:</b> a Zod schema checks every field again on the server, the honeypot catches '
         'bots, and helper functions escape HTML and remove line breaks from header fields (Fig. 3.34).'])
fig('code-contact.png', 'Validation, escaping and rate limiting of the contact form (api/contact.js)')
bullets(['<b>Event-based coordination:</b> a small event bus lets separate parts of the page talk to each other. '
         'openWindow and watchWindow implement the one-window rule, and the same bus tells the avatars when to play a '
         'move (Fig. 3.35).'])
fig('code-windows.png', 'The one-window rule (src/lib/fx.js)')
bullets(['<b>Animation blending:</b> the Blender clips are played through the Three.js animation mixer. One-shot clips '
         'cross-fade in and then return to the current base clip, which is Think, Talk or Idle depending on what the '
         'chatbot is doing (Fig. 3.36).',
         '<b>Hooks and components:</b> React components such as Hero, Room, Chatbot and Promo keep their own state with '
         'useState and useRef, and useEffect handles subscriptions, timers and clean-up.',
         '<b>Render loop:</b> useFrame runs code every frame for the look-at, IK, ball physics and first-person walking, '
         'and the canvases pause when they are off screen.'])
fig('code-clips.png', 'Playing and blending the Blender animation clips (src/components/Hero.jsx)')

h2('Blender and Animation Concepts Used')
bullets(['<b>Armature and bones:</b> the rig follows the Mixamo naming (mixamorig:Hips, Spine, LeftArm and so on), '
         'which made it easy to find the bones from Python.',
         '<b>Pose bones and keyframes:</b> each clip is built by setting bone rotations with a small helper that rotates '
         'a bone around a world axis through its own joint, and keying the result every few frames.',
         '<b>Skin weights:</b> the jacket problem was fixed by measuring each vertex\'s distance to the arm bones in the '
         'rest pose. Vertices within a sleeve\'s radius keep their arm weight, vertices further out fade over a few '
         'centimetres and give their weight to the torso bone at that height (Fig. 3.41).',
         '<b>Export for the web:</b> separate actions become separate glTF animation clips, textures are reduced to 1024 '
         'px and Draco compresses the mesh.'])
fig('code-weights.png', 'Moving arm influence from the jacket to the torso (blender/build_avatar.py)')

# ---- 4. RESULTS ---------------------------------------------------------------------------------------------------------
h1('Results')
p('This section presents the working screens of the deployed website and discusses the results of testing. All '
  'screenshots were taken from the live site.')

h2('Portfolio Screens', need=10 * cm)
fig('02-about.jpg', 'About me with photo, key numbers and CV download')
fig('04-promo-chapters-theatre.jpg', 'Promo video in theatre mode with chapter buttons and progress bar')
fig('06-room-walk.jpg', 'First-person walk mode inside the room')
fig('07-skills.jpg', 'Skills section with the skill ball pit')
fig('08-projects-map.jpg', 'Projects shown as a level map')
fig('09-projects-grid-filter.jpg', 'Grid view filtered to Unity projects')
fig('10-project-universe.jpg', 'The 3D Unity "universe" opened from the hero scene')
fig('11-project-detail.jpg', 'Project detail with trailer, description, tools and role')
fig('12-education.jpg', 'Education and experience timeline')

h2('Chatbot and Contact System', need=10 * cm)
fig('15-chatbot-answer.jpg', 'Chatbot answer with source citations')
fig('16-chatbot-unknown-urdu.jpg', 'The chatbot refusing to guess, and answering an Urdu question in English')
fig('13-contact-validation.jpg', 'Validation messages when the form is sent empty')
fig('14-contact-success.jpg', 'Success message after sending a message from the live site')
fig('email-1-site-message.png', 'A message sent through the website, received in my Gmail inbox', max_h=7 * cm)
fig('email-2-live-test.png', 'Test message sent from the deployed site on Vercel', max_h=7 * cm)
fig('email-3-local-test.png', 'Test message sent while developing locally', max_h=7 * cm)

h2('Extra Features', need=10 * cm)
fig('17-games-menu.jpg', 'Games window opened from the computer in the room')
fig('18-guess-the-game.jpg', 'Guess the Game: a blurred screenshot of one of my games')
fig('19-skill-stack.jpg', 'Skill Stack: a tower of my skills')
fig('21-photo-card.jpg', 'Photo booth card with the avatar in the chosen pose')
fig('22-achievements.jpg', 'Achievements menu')
fig('23-light-theme.jpg', 'Light theme')
fig('mobile-pair.jpg', 'Phone layout: home and projects', width=11 * cm, max_h=10 * cm)

h2('Deployment', need=10 * cm)
fig('26-github-repo.jpg', 'GitHub repository connected to Vercel (one contributor)')

h2('Result Discussion')
p('<b>Chatbot.</b> Table 4.1 shows questions asked on the live site. The chatbot answered from my documents, cited its '
  'sources and refused to guess when the answer was not there. One mistake came up during testing: asked which games '
  'were made in Unreal Engine, it also listed Unbroken Oath. The reason was that my CV text did not say which engine '
  'Unbroken Oath used, so the model filled the gap from other passages. After I added "built in Unity (C#)" to that '
  'line and rebuilt the index, the answer was correct in repeated tests. This showed in practice that RAG answers are '
  'only as good as the documents behind them.')
table('Chatbot test questions', [
    ['Question', 'Answer given', 'Result'],
    ['Where did she intern?', 'NED University (web), TreeObit Studios, The Game Storm Studios, with sources', 'Correct'],
    ['What is her CGPA?', '3.401 / 4.0', 'Correct'],
    ['What awards has she won?', 'Second Prize at GameCon 2026 for Unbroken Oath', 'Correct'],
    ['Which engine was Unbroken Oath made in?', 'Unity', 'Correct'],
    ['What games has she made in Unreal Engine?', 'Spike Rush and Germ Endless Runner', 'Correct after the CV fix'],
    ['Does she have a pet cat?', '"I don\'t have that information", suggests the contact form', 'Correct refusal'],
    ['Duaa ne kahan internship ki? (Roman Urdu)', 'Answer in English with the internships', 'Correct'],
    ['"Where did you intern?" asked in Urdu script', 'Answer in English with the internships', 'Correct'],
], [5.6 * cm, 7.4 * cm, 3 * cm])
p('<b>Contact system.</b> Sending the form empty showed a message under each field, and the server rejected invalid '
  'data in the same way. Messages sent from my computer, from the live site and by a normal visit all arrived in my '
  'Gmail inbox (Fig. 4.25 to Fig. 4.27). The SMTP password is not in the repository; it exists only in the local .env '
  'file and in the Vercel settings.')
p('<b>Performance and layout.</b> The avatar model went from 7.5 MB to about 1.35 MB and the promo from 21.7 MB to '
  '3.8 MB, which made the first load much faster on a slow connection. The layout was checked at desktop, tablet and '
  'phone widths with no horizontal scrolling, and the 3D cameras adjust their framing to the screen shape.')
table('Requirements and where they are met', [
    ['Requirement', 'Where it is met'],
    ['3D environment, home, about, skills, projects, education, contact', 'Section 3.2.1, 3.2.2, Section 4.1'],
    ['Animations, navigation, responsive design', 'Section 3.2.1, Fig. 4.37'],
    ['Avatar customised in Blender, materials, rig, GLB, shown animated', 'Section 3.2.3 and 3.4, blender/ folder'],
    ['30 to 60 s video in After Effects, licensed music, MP4 embedded', 'Section 3.2.4, after-effects/ folder'],
    ['RAG chatbot: chunks, embeddings, vector index, retrieval, grounded LLM answers', 'Section 3.2.5 and 3.3, Table 4.1'],
    ['Contact form with validation, email delivery, secrets, spam protection', 'Section 3.2.6, Section 4.2'],
    ['Deployment and documentation', 'Section 3.2.7, README.md, this report'],
], [9.5 * cm, 6.5 * cm])
table('Extra credit features', [
    ['Feature from the brief', 'Implementation'],
    ['3D objects that respond to the mouse', 'Avatar head tracking, hover on icons, clickable room, throwable skill balls'],
    ['Dark and light themes', 'Theme button in the navigation bar, remembered between visits'],
    ['Voice interaction with the chatbot', 'Microphone input and spoken answers, with a mute button'],
    ['Multilingual chatbot', 'Understands English and Urdu questions, always answers in English'],
    ['Avatar expressions or gestures', 'Seven Blender clips plus wave, reach and pinch'],
    ['Project filtering and search', 'Engine filters and free-text search; map and grid views'],
    ['Accessibility', 'Keyboard support, labels for screen readers, visible focus, reduced-motion support'],
    ['Chatbot source citations', 'Each answer lists its sources, which scroll to the matching section'],
], [5.5 * cm, 10.5 * cm])

# ---- 5. CONCLUSION ------------------------------------------------------------------------------------------------------
h1('Conclusion')
p('The project produced a complete, deployed portfolio that combines a 3D website, a Blender avatar, an After Effects '
  'video, a grounded AI chatbot and a working email system. Each part was tested on the live site, and the source files '
  'for the avatar (.blend) and the video (.aep) are included in the repository.')
p('The most useful lessons came from the problems. The AI-generated jacket taught me how skin weights really work, '
  'the chatbot\'s Unreal Engine mistake showed how much a RAG system depends on clear documents, and the early version '
  'with too many pop-ups taught me that a calm, single flow is more important than adding more features.')
p('In the future I would like to model the avatar fully by hand, add facial expressions and lip-sync for the talking '
  'animation, and add analytics to see which sections visitors use the most.')

# ---- REFERENCES ---------------------------------------------------------------------------------------------------------
story.append(Paragraph('REFERENCES', H1))
for r in ['[1] The Khronos Group, glTF 2.0 Specification, 2021. Available: registry.khronos.org/glTF',
          '[2] P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," Advances in Neural '
          'Information Processing Systems (NeurIPS), 2020.',
          '[3] V. Karpukhin et al., "Dense Passage Retrieval for Open-Domain Question Answering," Proceedings of EMNLP, 2020.',
          '[4] three.js documentation, threejs.org/docs.',
          '[5] Poimandres, React Three Fiber documentation, r3f.docs.pmnd.rs.',
          '[6] Z. Ji et al., "Survey of Hallucination in Natural Language Generation," ACM Computing Surveys, vol. 55, 2023.',
          '[7] OWASP Foundation, Input Validation Cheat Sheet, cheatsheetseries.owasp.org.',
          '[8] K. MacLeod, "Voxel Revolution," incompetech.com, licensed under Creative Commons: By Attribution 4.0.',
          '[9] Blender Foundation, Blender 5 Manual: Rigging and Animation, docs.blender.org.',
          '[10] Google, Gemini API documentation: Embeddings and Text Generation, ai.google.dev.']:
    story.append(Paragraph(r, ParagraphStyle('Ref', parent=BODY, alignment=0, leftIndent=24, firstLineIndent=-24)))

# ---- build ---------------------------------------------------------------------------------------------------------------
doc = Report(OUT, pagesize=A4, leftMargin=2.5 * cm, rightMargin=2.5 * cm, topMargin=2.3 * cm, bottomMargin=2.3 * cm,
             title='Interactive 3D Web Portfolio - Project Report', author='Duaa Khalid')
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate('cover', frames=[frame], onPage=cover),
                      PageTemplate('front', frames=[frame], onPageEnd=footer_front),
                      PageTemplate('main', frames=[frame], onPageEnd=footer_main)])
doc.multiBuild(story)
print('wrote', OUT)
