"""Gera hooks/assets.ts a partir dos dois GIFs/WebPs animados da barra.

Uso:
    python3 tools/make_assets.py <boneco.webp> <caverna.webp>

<boneco>  animação em pixel art (200x200, desenho de 64x64 ampliado 3,125x)
          sobre fundo lilás liso; vira uma folha de 4 quadros sem o fundo.
<caverna> clipe animado (200x130); é espelhado, reduzido a 10 quadros por
          segundo e a 144x94, e vira uma folha WebP.

Precisa do Pillow (pip install pillow).
"""

import base64
import io
import pathlib
import sys

from PIL import Image, ImageOps

if len(sys.argv) != 3:
    sys.exit(__doc__)

sprite_path, clip_path = sys.argv[1], sys.argv[2]
out = pathlib.Path(__file__).resolve().parent.parent / 'hooks' / 'assets.ts'

# --- o boneco: amostra o centro de cada pixel do desenho original
BG = (148, 138, 171)


def dist(a, b):
    return sum(abs(a[i] - b[i]) for i in range(3))


src = Image.open(sprite_path)
grids = []
for k in range(getattr(src, 'n_frames', 1)):
    src.seek(k)
    f = src.convert('RGB')
    p = f.load()
    grids.append([[p[int(3.125 * (x + 0.5)), int(3.125 * (y + 0.5))] for x in range(64)] for y in range(64)])

cols = [c for g in grids for row in g for c in row if dist(c, BG) > 55]
tmp = Image.new('RGB', (len(cols), 1))
tmp.putdata(cols)
q = tmp.quantize(colors=24, method=Image.Quantize.MEDIANCUT, kmeans=4)
pal = q.getpalette()[:72]
pal = [tuple(pal[i:i + 3]) for i in range(0, 72, 3)]


def snap(c):
    return min(pal, key=lambda p: dist(c, p))


# recorte: só a figura, sem a assinatura no canto
X0, X1, Y0, Y1 = 14, 58, 10, 52
FW, FH = X1 - X0, Y1 - Y0
sheet = Image.new('RGBA', (FW, FH * len(grids)), (0, 0, 0, 0))
sp = sheet.load()
for n, g in enumerate(grids):
    for y in range(Y0, Y1):
        for x in range(X0, X1):
            c = g[y][x]
            if dist(c, BG) > 55 and not (x >= 52 and y >= 56):
                sp[x - X0, n * FH + y - Y0] = snap(c) + (255,)
buf = io.BytesIO()
sheet.save(buf, 'PNG', optimize=True)
sprite_b64 = base64.b64encode(buf.getvalue()).decode()

# --- a caverna: espelhada, um quadro sim outro não (10 qps)
clip = Image.open(clip_path)
CW, CH, STEP = 144, 94, 2
idx = list(range(0, getattr(clip, 'n_frames', 1), STEP))
cs = Image.new('RGB', (CW, CH * len(idx)))
for n, k in enumerate(idx):
    clip.seek(k)
    cs.paste(ImageOps.mirror(clip.convert('RGB')).resize((CW, CH), Image.LANCZOS), (0, n * CH))
buf = io.BytesIO()
cs.save(buf, 'WEBP', quality=26, method=6)
clip_b64 = base64.b64encode(buf.getvalue()).decode()

out.write_text(
    '// Gerado por tools/make_assets.py: o boneco em pixel art (folha 44x42 de\n'
    '// 4 quadros) e o clipe da caverna espelhado a 10 qps (folha 144x94).\n'
    f'export const SPRITE = {{ w: {FW}, h: {FH}, frames: {len(grids)}, ms: 90, uri: "data:image/png;base64,{sprite_b64}" }} as const\n'
    f'export const CLIP = {{ w: {CW}, h: {CH}, frames: {len(idx)}, ms: {50 * STEP}, uri: "data:image/webp;base64,{clip_b64}" }} as const\n'
)
print(f'{out} escrito: boneco {len(sprite_b64)} + caverna {len(clip_b64)} caracteres')
