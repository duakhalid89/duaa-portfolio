"""Turn phone screen-recordings of LinkedIn posts back into clean 16:9 "laptop" videos.

Crops out the phone status bar, the black bars and the LinkedIn UI, keeps only the seconds where no overlay is
visible, and upscales to 16:9. Writes the web trailer + poster into public/ and a 1280x720 copy next to the source.
Usage: python scripts/reframe-recordings.py <raw_dir>   (needs: pip install imageio-ffmpeg)
"""
import json, os, subprocess, sys
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
raw = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public')

# file: (project id, (crop w, h, x, y) in the 384x848 phone frame, (start, end) seconds without LinkedIn/phone UI)
MAP = {
    'master_portal.mp4': ('ms-admission', (384, 208, 0, 309), (1.6, 44.6)),
    'snakevideo.mp4': ('snake-game', (384, 222, 0, 313), (0.0, 17.8)),
}

for f, (pid, (cw, ch, cx, cy), (t0, t1)) in MAP.items():
    src = os.path.join(raw, f)
    if not os.path.exists(src): continue
    # The crop is within ~3% of 16:9, so it is scaled straight to 16:9 (no visible stretch, no black bars).
    look = f'crop={cw}:{ch}:{cx}:{cy},fps=30,scale={{w}}:{{h}}:flags=lanczos,unsharp=5:5:0.8:5:5:0,setsar=1'
    fade = f'fade=in:st=0:d=0.4,fade=out:st={t1 - t0 - 0.5}:d=0.5'
    for w, h, dst in [(854, 480, os.path.join(OUT, 'videos', f'{pid}.mp4')),
                      (1280, 720, os.path.join(raw, f'{pid}_laptop.mp4'))]:
        subprocess.run([FF, '-y', '-ss', str(t0), '-to', str(t1), '-i', src, '-vf', f'{look.format(w=w, h=h)},{fade}',
                        '-c:v', 'libx264', '-crf', '20' if w == 1280 else '26', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                        '-an', '-movflags', '+faststart', dst], check=True, capture_output=True)
    poster = os.path.join(OUT, 'posters', f'{pid}.jpg')
    subprocess.run([FF, '-y', '-ss', str(t0 + (t1 - t0) * 0.4), '-i', src, '-frames:v', '1',
                    '-vf', look.format(w=640, h=360), '-q:v', '3', poster], check=True, capture_output=True)
    print(f'{pid}: {t1 - t0:.1f}s, {os.path.getsize(os.path.join(OUT, "videos", f"{pid}.mp4")) / 1e6:.1f} MB')

vids = sorted(f[:-4] for f in os.listdir(os.path.join(OUT, 'videos')) if f.endswith('.mp4'))
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'media.json'), 'w') as fh:
    json.dump({'videos': vids}, fh, indent=2)
print('media.json ->', vids)
