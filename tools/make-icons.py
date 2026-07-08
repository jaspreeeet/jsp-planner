#!/usr/bin/env python3
"""Generate JSP·OS icons: pixel-art cassette PWA icons (PNG) via Pillow."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
os.makedirs(OUT, exist_ok=True)

INK = (33, 29, 25, 255)
PAPER = (242, 236, 221, 255)
ORANGE = (255, 107, 53, 255)
AMBER = (255, 179, 71, 255)
CREAM = (242, 236, 221, 255)

def rounded(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def make_icon(size):
    S = size / 128.0  # design at 128, scale up
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # background tile: sunset gradient (vertical bands) with ink border
    grad = Image.new('RGBA', (size, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / size
        c = tuple(int(ORANGE[i] + (AMBER[i] - ORANGE[i]) * t) for i in range(3)) + (255,)
        gd.line([(0, y), (size, y)], fill=c)
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(28 * S), fill=255)
    img.paste(grad, (0, 0), mask)
    d.rounded_rectangle([int(2 * S)] * 2 + [size - int(2 * S)] * 2, radius=int(26 * S),
                        outline=INK, width=max(2, int(5 * S)))

    # cassette body
    bx0, by0, bx1, by1 = int(18 * S), int(34 * S), size - int(18 * S), size - int(34 * S)
    rounded(d, [bx0, by0, bx1, by1], int(8 * S), CREAM, INK, max(2, int(4 * S)))
    # label stripe
    rounded(d, [bx0 + int(8 * S), by0 + int(8 * S), bx1 - int(8 * S), by0 + int(24 * S)],
            int(3 * S), AMBER, INK, max(1, int(2.5 * S)))
    # reel window
    wy0 = by0 + int(30 * S); wy1 = by1 - int(10 * S)
    rounded(d, [bx0 + int(14 * S), wy0, bx1 - int(14 * S), wy1], int(10 * S),
            (60, 54, 48, 255), INK, max(1, int(2.5 * S)))
    # reels
    ry = (wy0 + wy1) // 2
    rr = int(9 * S)
    for rx in (bx0 + int(30 * S), bx1 - int(30 * S)):
        d.ellipse([rx - rr, ry - rr, rx + rr, ry + rr], fill=CREAM, outline=INK, width=max(1, int(2 * S)))
        hr = int(3.5 * S)
        d.ellipse([rx - hr, ry - hr, rx + hr, ry + hr], fill=(60, 54, 48, 255))
    return img

for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'icon-180.png')]:
    make_icon(size).save(os.path.join(OUT, name))
    print('wrote', name)

# maskable icon (extra padding, solid bg to edges)
m = Image.new('RGBA', (512, 512), ORANGE)
inner = make_icon(400)
m.paste(inner, (56, 56), inner)
m.save(os.path.join(OUT, 'icon-maskable.png'))
print('wrote icon-maskable.png')
