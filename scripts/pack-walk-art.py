"""Register generated six-pose sheets into fixed-size transparent strips.

Input: JSON object mapping unit IDs to image_gen source PNGs (kept outside repo).
Uses Pillow only to measure alpha; ImageMagick packages existing painted pixels.
Never synthesizes poses or alters the retained five atlases. Requires Pillow and magick.
"""
import hashlib
import json
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
roster = json.loads((ROOT / 'data/balance/chinese_campaign_v2.json').read_text())
sources = json.loads(Path(sys.argv[1]).read_text())
out = ROOT / 'public/assets/painted/walk'
out.mkdir(parents=True, exist_ok=True)
assets = []

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for u in roster['units']:
    if 'walk' not in u:
        continue
    source = Path(sources[u['id']])
    im = Image.open(source).convert('RGBA')
    alpha = im.getchannel('A')
    w, h = im.size
    # Find transparent gutters near the six nominal cell boundaries; the generator
    # may use a taller sheet or slightly uneven spacing. Never slice a visible limb.
    coverage = [sum(v > 16 for v in alpha.crop((x, 0, x+1, h)).tobytes()) for x in range(w)]
    cuts = [0]
    for n in range(1, 6):
        center = w*n/6
        candidates = range(round(center-w/24), round(center+w/24))
        cut = min(candidates, key=lambda x: (coverage[x], abs(x-center)))
        if coverage[cut] > 2:
            raise ValueError(f'{u["id"]}: no transparent gutter at frame {n}; inspect/regenerate')
        cuts.append(cut)
    cuts.append(w)
    boxes = []
    for left, right in zip(cuts, cuts[1:]):
        box = alpha.crop((left, 0, right, h)).point(lambda v: 255 if v > 16 else 0).getbbox()
        if not box:
            raise ValueError(f'{u["id"]}: empty frame')
        x0, y0, x1, y1 = box
        boxes.append((left+x0, y0, left+x1, y1))
    # Keep one scale for all six frames, one foot baseline, and stable center.
    # Match the original atlas cell / standalone art's occupied height and baseline.
    if u.get('art'):
        ref = Image.open(ROOT / 'public' / u['art']).convert('RGBA')
    else:
        atlas = Image.open(ROOT / 'public/assets/painted/units-v1.png')
        n = u['sourceTroopId']
        aw, ah = atlas.size
        ref = atlas.crop((round(n % 5*aw/5), round(n//5*ah/5), round((n % 5+1)*aw/5), round((n//5+1)*ah/5)))
    rw, rh = ref.size
    rb = ref.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
    target_height = (rb[3]-rb[1])*256/rh
    baseline = min(254, round(rb[3]*256/rh))
    scale = min(target_height/statistics.median(b[3]-b[1] for b in boxes), 244/max(b[2]-b[0] for b in boxes), (baseline-2)/max(b[3]-b[1] for b in boxes))
    with tempfile.TemporaryDirectory() as tmp:
        frames = []
        for i, (x0,y0,x1,y1) in enumerate(boxes):
            dw, dh = round((x1-x0)*scale), round((y1-y0)*scale)
            path = Path(tmp) / f'{i}.png'
            subprocess.run(['magick', str(source), '-crop', f'{x1-x0}x{y1-y0}+{x0}+{y0}', '+repage', '-resize', f'{dw}x{dh}!', '-background', 'none', '-gravity', 'south', '-extent', f'256x{baseline}', '-gravity', 'north', '-extent', '256x256', f'PNG32:{path}'], check=True)
            frames.append(str(path))
        path = out / f'{u["id"]}.png'
        subprocess.run(['magick', *frames, '+append', f'PNG32:{path}'], check=True)
    assets.append({'file': path.name, 'unitId': u['id'], 'kind':'walk-strip', 'layout':'6x1, left contact / passing / swing / right contact / passing / swing', 'frames':6, 'frameWidth':256, 'frameHeight':256, 'width':1536, 'height':256, 'bytes':path.stat().st_size, 'sha256':sha(path), 'origin':'Original OpenAI image_gen articulated poses, referenced only Jiuzhou original painted unit art; no source-game imagery. Alpha gutters cropped and frames registered/scaled with ImageMagick; no procedural rigid-leg pose synthesis.', 'sourceSha256':sha(source), 'sourceFrameBounds':boxes, 'scale':scale, 'baseline':baseline})
(out / 'manifest.json').write_text(json.dumps({'version':'1.5-art.1','assets':assets},ensure_ascii=False,indent=2)+'\n')
print(f'Packed {len(assets)} walk strips')
