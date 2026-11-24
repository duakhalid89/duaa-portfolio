"""Cut short web trailers + posters from the full gameplay videos.
Usage: python scripts/make-trailers.py <raw_dir>   (needs: pip install imageio-ffmpeg)
Each trailer = three ~5s highlights (at 15%, 45%, 75% of the video), 854x480, muted-friendly H.264.
"""
import os, re, subprocess, sys
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
raw = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
MAP = {
    'The Unbroken Oath Trailer.mp4': ('unbroken-oath', 'whole'),
    'The_Abduction.mp4': ('abduction', 'cuts'),
    'VR_Escape_Room.mp4': ('escape-room-vr', 'cuts'),
    'Germ_Endless_Runner.mp4': ('germ-endless-runner', 'cuts'),
    'Spike Rush.mp4': ('spike-rush', 'cuts'),
    'Mask_Regime.mp4': ('mask-regime', 'whole'),
    'Multiplayer_Ludo.mp4': ('multiplayer-ludo', 'cuts'),
}

def duration(path):
    r = subprocess.run([FF, '-i', path], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])

for root, _, files in os.walk(raw):
    for f in files:
        if f not in MAP: continue
        pid, mode = MAP[f]
        src = os.path.join(root, f)
        dur = duration(src)
        vid = os.path.join(OUT, 'videos', f'{pid}.mp4')
        scale = 'scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,setsar=1'
        if mode == 'whole':
            n = min(dur, 30)
            cmd = [FF, '-y', '-i', src, '-t', str(n), '-vf', scale, '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast',
                   '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', vid]
        else:
            seg = 5
            starts = [max(0, min(dur * p, dur - seg - 1)) for p in (0.15, 0.45, 0.75)]
            parts = ''.join(f'[0:v]trim=start={s}:duration={seg},setpts=PTS-STARTPTS,{scale}[v{i}];' for i, s in enumerate(starts))
            filt = parts + ''.join(f'[v{i}]' for i in range(3)) + 'concat=n=3:v=1:a=0[v]'
            cmd = [FF, '-y', '-i', src, '-filter_complex', filt, '-map', '[v]', '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast',
                   '-an', '-movflags', '+faststart', vid]
        os.makedirs(os.path.dirname(vid), exist_ok=True)
        subprocess.run(cmd, check=True, capture_output=True)
        poster = os.path.join(OUT, 'posters', f'{pid}.jpg')
        os.makedirs(os.path.dirname(poster), exist_ok=True)
        subprocess.run([FF, '-y', '-ss', str(min(2, dur / 2) if mode == 'whole' else starts[0] + 1), '-i', src, '-frames:v', '1',
                        '-vf', 'scale=640:360:force_original_aspect_ratio=increase,crop=640:360', '-q:v', '4', poster], check=True, capture_output=True)
        print(f'{pid}: {os.path.getsize(vid) / 1e6:.1f} MB trailer from {dur:.0f}s source')

# Record which games have a trailer so the site only offers video where it exists.
import json
vids = sorted(f[:-4] for f in os.listdir(os.path.join(OUT, 'videos')) if f.endswith('.mp4'))
with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'media.json'), 'w') as fh:
    json.dump({'videos': vids}, fh, indent=2)
print('media.json ->', vids)
