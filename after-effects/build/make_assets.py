"""Generates the background plate, tool icon tiles and synthesized SFX for the Duaa promo.
Run: python -I make_assets.py "<project root>"
"""
import sys, os, wave, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = sys.argv[1]
IMG = os.path.join(ROOT, "assets", "images")
AUD = os.path.join(ROOT, "assets", "audio")
FONTS = r"C:\Windows\Fonts"

def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# ---------------- background plate ----------------
W, H = 1920, 1080
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
base = np.zeros((H, W, 3), np.float32)
top, bot = np.array(hexrgb("#0B0618"), np.float32), np.array(hexrgb("#140A2A"), np.float32)
t = (y / H)[..., None]
base[:] = top * (1 - t) + bot * t
def glow(cx, cy, r, col, a):
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
    g = np.clip(1 - d, 0, 1) ** 2.2 * a
    return g[..., None] * np.array(hexrgb(col), np.float32)
base += glow(W*0.18, H*0.15, 900, "#7C4DFF", 0.35)
base += glow(W*0.88, H*0.90, 950, "#E040FB", 0.28)
base += glow(W*0.70, H*0.05, 600, "#00E5FF", 0.10)
# faint perspective-free grid
grid = ((x % 80 < 1.2) | (y % 80 < 1.2)).astype(np.float32) * 6
base += grid[..., None]
# vignette
d = np.sqrt(((x - W/2) / (W/2)) ** 2 + ((y - H/2) / (H/2)) ** 2)
base *= (1 - np.clip(d - 0.55, 0, 1) * 0.55)[..., None]
Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).save(os.path.join(IMG, "bg.png"))

# ---------------- tool tiles ----------------
TOOLS = [
    ("unity", "Un", "#2B2B2B", "#5A5A5A"),
    ("unreal", "UE", "#0D0D0D", "#3A3A55"),
    ("csharp", "C#", "#68217A", "#9B4FC4"),
    ("cpp", "C++", "#00599C", "#3FA3E8"),
    ("blender", "Bl", "#E87D0D", "#F5B14C"),
    ("quest", "VR", "#1A1F71", "#00E5FF"),
    ("threejs", "3JS", "#111111", "#E040FB"),
]
S = 256
for name, label, c1, c2 in TOOLS:
    g = Image.new("RGB", (S, S))
    a, b = np.array(hexrgb(c1), np.float32), np.array(hexrgb(c2), np.float32)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    tt = ((xx + yy) / (2 * S))[..., None]
    g = Image.fromarray((a * (1 - tt) + b * tt).astype(np.uint8))
    # top gloss
    gloss = Image.new("L", (S, S), 0)
    ImageDraw.Draw(gloss).ellipse((-S*0.4, -S*0.9, S*1.4, S*0.45), fill=38)
    g = Image.composite(Image.new("RGB", (S, S), (255, 255, 255)), g, gloss)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S-1, S-1), radius=56, fill=255)
    tile = Image.new("RGBA", (S, S), (0, 0, 0, 0)); tile.paste(g, (0, 0), mask)
    dr = ImageDraw.Draw(tile)
    dr.rounded_rectangle((3, 3, S-4, S-4), radius=54, outline=(255, 255, 255, 70), width=4)
    size = 132 if len(label) <= 2 else 104
    f = ImageFont.truetype(os.path.join(FONTS, "seguibl.ttf"), size)
    bb = dr.textbbox((0, 0), label, font=f)
    dr.text(((S - (bb[2]-bb[0])) / 2 - bb[0], (S - (bb[3]-bb[1])) / 2 - bb[1]), label, font=f, fill=(255, 255, 255, 255))
    tile.save(os.path.join(IMG, f"tool_{name}.png"))

# soft round glow sprite (for particles / light leaks)
gs = 512
yy, xx = np.mgrid[0:gs, 0:gs].astype(np.float32)
dd = np.sqrt((xx - gs/2) ** 2 + (yy - gs/2) ** 2) / (gs/2)
al = (np.clip(1 - dd, 0, 1) ** 2 * 255).astype(np.uint8)
spr = np.dstack([np.full_like(al, 255)] * 3 + [al])
Image.fromarray(spr, "RGBA").save(os.path.join(IMG, "glow.png"))

# circular-cropped profile with transparent bg
p = Image.open(os.path.join(IMG, "profile.png")).convert("RGB").resize((600, 600), Image.LANCZOS)
m = Image.new("L", (600, 600), 0); ImageDraw.Draw(m).ellipse((0, 0, 599, 599), fill=255)
pc = Image.new("RGBA", (600, 600), (0, 0, 0, 0)); pc.paste(p, (0, 0), m)
pc.save(os.path.join(IMG, "profile_round.png"))

# ---------------- SFX ----------------
SR = 48000
rng = np.random.default_rng(7)
def write(name, sig):
    sig = np.clip(sig, -1, 1)
    st = np.stack([sig, sig], 1)
    with wave.open(os.path.join(AUD, name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())

def lowpass(sig, cutoff_arr):
    out = np.zeros_like(sig); yv = 0.0
    for i, s in enumerate(sig):
        a = 1 - math.exp(-2 * math.pi * cutoff_arr[i] / SR)
        yv += a * (s - yv); out[i] = yv
    return out

# whoosh: band-swept noise, swell then decay
n = int(SR * 0.55); tt = np.linspace(0, 1, n)
env = np.sin(np.pi * tt ** 0.7) ** 2
cut = 300 + 5200 * np.sin(np.pi * tt) ** 2
noise = rng.standard_normal(n)
wh = lowpass(noise, cut) - lowpass(noise, cut * 0.25)
write("sfx_whoosh.wav", wh / np.max(np.abs(wh)) * env * 0.55)

# pop: quick sine with pitch drop
n = int(SR * 0.14); tt = np.arange(n) / SR
f = 900 * np.exp(-tt * 28) + 380
ph = 2 * np.pi * np.cumsum(f) / SR
write("sfx_pop.wav", np.sin(ph) * np.exp(-tt * 38) * 0.5)

# tick: typewriter-ish click
n = int(SR * 0.04); tt = np.arange(n) / SR
tk = rng.standard_normal(n) * np.exp(-tt * 260) * 0.35 + np.sin(2*np.pi*2400*tt) * np.exp(-tt * 300) * 0.25
write("sfx_tick.wav", tk)

# impact: sub boom + noise burst
n = int(SR * 1.1); tt = np.arange(n) / SR
f = 110 * np.exp(-tt * 6) + 38
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2)
burst = lowpass(rng.standard_normal(n), np.full(n, 2500.0)) * np.exp(-tt * 14) * 0.6
write("sfx_impact.wav", (boom * 0.85 + burst) * 0.7)

# shimmer: rising sparkle for highlights
n = int(SR * 0.6); tt = np.arange(n) / SR
sh = sum(np.sin(2*np.pi*(1200*k)*(1+tt*0.6)*tt) / k for k in (1, 1.5, 2, 3))
write("sfx_shimmer.wav", sh / 3 * np.sin(np.pi * tt / tt[-1]) ** 2 * 0.25)

print("assets ok")
