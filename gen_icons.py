"""
Generate CGM Plus PWA icons.
- icon-192.png    (192x192, purpose: any)   - full-bleed background, logo ~70% of canvas
- icon-512.png    (512x512, purpose: any)   - full-bleed background, logo ~70% of canvas
- icon-512-maskable.png (512x512, purpose: maskable) - logo inside inner safe zone (80%)
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/sessions/stoic-wonderful-einstein/mnt/Trinity Demo/trinity-cgm-plus-pwa"
BG = (255, 248, 240, 255)       # #FFF8F0 (BioT cream)
ACCENT = (217, 119, 87, 255)    # warm coral (CGM Plus brand-adjacent)
DARK = (62, 39, 35, 255)        # #3E2723 deep brown for text

def make_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)

    # Safe zone for maskable: keep content within central 80%
    margin = int(size * 0.10) if maskable else int(size * 0.08)
    content_size = size - 2 * margin

    # Rounded-square disc behind the mark (only for 'any' variant; maskable stays flat)
    if not maskable:
        disc_margin = int(size * 0.08)
        disc_box = (disc_margin, disc_margin, size - disc_margin, size - disc_margin)
        radius = int(size * 0.22)
        d.rounded_rectangle(disc_box, radius=radius, fill=(255, 240, 224, 255))

    # Glucose drop shape: circle with a triangular top (teardrop)
    cx = size // 2
    cy = size // 2 + int(size * 0.04)
    r = int(content_size * 0.28)

    # Drop body (circle)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ACCENT)

    # Drop tip (triangle pointing up)
    tip_top = cy - int(r * 2.1)
    tip_left = (cx - int(r * 0.75), cy)
    tip_right = (cx + int(r * 0.75), cy)
    tip_apex = (cx, tip_top)
    d.polygon([tip_left, tip_apex, tip_right], fill=ACCENT)

    # Small "+" mark on the drop for CGM "Plus"
    plus_w = int(r * 0.18)
    plus_len = int(r * 0.55)
    # vertical bar
    d.rectangle(
        (cx - plus_w // 2, cy - plus_len // 2, cx + plus_w // 2, cy + plus_len // 2),
        fill=(255, 255, 255, 255),
    )
    # horizontal bar
    d.rectangle(
        (cx - plus_len // 2, cy - plus_w // 2, cx + plus_len // 2, cy + plus_w // 2),
        fill=(255, 255, 255, 255),
    )

    return img

os.makedirs(OUT, exist_ok=True)

make_icon(192, maskable=False).save(os.path.join(OUT, "icon-192.png"))
make_icon(512, maskable=False).save(os.path.join(OUT, "icon-512.png"))
make_icon(512, maskable=True).save(os.path.join(OUT, "icon-512-maskable.png"))

for f in ["icon-192.png", "icon-512.png", "icon-512-maskable.png"]:
    p = os.path.join(OUT, f)
    print(f"{f}: {os.path.getsize(p)} bytes")
