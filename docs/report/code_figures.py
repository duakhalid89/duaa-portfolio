"""Renders short excerpts of the real source files as images for the report (docs/report/figures/code-*.png)."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'report', 'figures')
os.makedirs(OUT, exist_ok=True)
FONT = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 26)
BOLD = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 24)

KEYWORDS = {'const', 'let', 'export', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'of', 'import', 'from',
            'def', 'try', 'catch', 'new', 'while', 'in', 'and', 'not', 'class', 'with', 'continue', 'null', 'true', 'false'}


def excerpt(path, start_marker, count, skip=0):
    lines = open(os.path.join(ROOT, path), encoding='utf8').read().split('\n')
    i = next(n for n, l in enumerate(lines) if start_marker in l) + skip
    return i + 1, lines[i:i + count]


def render(name, path, first, lines):
    pad, lh = 28, 34
    width = 1500
    height = 70 + pad + lh * len(lines) + pad
    img = Image.new('RGB', (width, height), '#1e1e2a')
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, width, 54], fill='#2b2b3b')
    for k, c in enumerate(['#ff5f57', '#febc2e', '#28c840']):
        d.ellipse([20 + k * 28, 18, 38 + k * 28, 36], fill=c)
    d.text((120, 14), path, font=BOLD, fill='#c9c3e6')
    y = 54 + pad
    for n, line in enumerate(lines):
        d.text((pad, y), f'{first + n:>3}', font=FONT, fill='#5c5a78')
        x = pad + 80
        line = line.replace('\t', '    ')
        if line.strip().startswith(('//', '#', '"""', '*', '/*', '{/*')):
            d.text((x, y), line, font=FONT, fill='#7f8c6a')
        else:
            # light colouring: strings, keywords, the rest
            token, in_str, q = '', False, ''
            for ch in line + ' ':
                if in_str:
                    token += ch
                    if ch == q:
                        d.text((x, y), token, font=FONT, fill='#e5c07b'); x += d.textlength(token, font=FONT); token, in_str = '', False
                    continue
                if ch in '\'"`':
                    if token:
                        col = '#c678dd' if token in KEYWORDS else '#dcdcf0'
                        d.text((x, y), token, font=FONT, fill=col); x += d.textlength(token, font=FONT)
                    token, in_str, q = ch, True, ch
                    continue
                if ch.isalnum() or ch == '_':
                    token += ch
                else:
                    if token:
                        col = '#c678dd' if token in KEYWORDS else ('#d19a66' if token.isdigit() else '#dcdcf0')
                        d.text((x, y), token, font=FONT, fill=col); x += d.textlength(token, font=FONT); token = ''
                    d.text((x, y), ch, font=FONT, fill='#9aa5ce'); x += d.textlength(ch, font=FONT)
            if token:
                d.text((x, y), token, font=FONT, fill='#e5c07b')
        y += lh
    img.save(os.path.join(OUT, f'code-{name}.png'))
    print('code-' + name, len(lines), 'lines')


FIGS = [
    ('chunking', 'scripts/build-index.js', 'const chunks = []', 11, 0),
    ('retrieve', 'api/_lib/rag.js', 'export async function retrieve(index, query, k = 5) {', 11, 0),
    ('prompt', 'api/chat.js', 'const SYSTEM = `', 11, 0),
    ('contact', 'api/contact.js', 'const schema = z.object({', 16, 0),
    ('windows', 'src/lib/fx.js', 'Only one window is open at a time', 5, 0),
    ('clips', 'src/components/Hero.jsx', 'Blender clips on demand', 24, 0),
    ('weights', 'blender/build_avatar.py', 'def fix_jacket_weights():', 22, 0),
]
for name, path, marker, count, skip in FIGS:
    first, lines = excerpt(path, marker, count, skip)
    render(name, path, first, lines)
