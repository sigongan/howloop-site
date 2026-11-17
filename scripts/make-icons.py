"""Regenerates Howloop's raster icons and default share image from the loop mark.

Run from the repo root: python3 scripts/make-icons.py  (needs Pillow)
Outputs into site/static/: favicon.ico, apple-touch-icon.png, assets/logo-512.png, assets/og-default.png
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "site" / "static"
CREAM = (255, 241, 230)
ORANGE = (217, 84, 30)
GREEN = (47, 107, 79)
INK = (31, 28, 24)
BG = (251, 248, 243)
MUTED = (93, 86, 77)


def mark(size, background=True):
    """Draw the loop mark at 8x and downsample for smooth edges (64-unit design grid)."""
    s = size * 8
    k = s / 64
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if background:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=16 * k, fill=CREAM)
    # Open ring: centre (32,32), radius 19, gap on the upper left.
    r = 19 * k
    half = 3 * k  # Pillow draws arc width inward from the box, so pad by half the stroke
    box = [32 * k - r - half, 32 * k - r - half, 32 * k + r + half, 32 * k + r + half]
    d.arc(box, start=-90, end=212, fill=ORANGE, width=round(6 * k))
    a = math.radians(-90)
    cx, cy = 32 * k + r * math.cos(a), 32 * k + r * math.sin(a)
    d.ellipse([cx - 3 * k, cy - 3 * k, cx + 3 * k, cy + 3 * k], fill=ORANGE)
    # Arrow head at the open end (same triangle as icon.svg).
    d.polygon([(19.6 * k, 16 * k), (20.45 * k, 25.96 * k), (10.27 * k, 19.6 * k)], fill=ORANGE)
    d.ellipse([25.5 * k, 25.5 * k, 38.5 * k, 38.5 * k], fill=GREEN)
    return img.resize((size, size), Image.LANCZOS)


def font(names, size):
    for name in names:
        for folder in ("/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/liberation"):
            path = Path(folder) / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main():
    (STATIC / "assets").mkdir(parents=True, exist_ok=True)
    mark(512).save(STATIC / "assets" / "logo-512.png")
    mark(180).convert("RGB").save(STATIC / "apple-touch-icon.png")
    mark(256).save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    og = Image.new("RGB", (1200, 630), BG)
    d = ImageDraw.Draw(og)
    d.rectangle([0, 0, 1200, 14], fill=ORANGE)
    og.paste(mark(150), (90, 120), mark(150))
    d.text((270, 140), "howloop", font=font(["DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"], 104), fill=INK)
    d.text((92, 330), "Why does food do that?", font=font(["DejaVuSerif-Bold.ttf"], 68), fill=INK)
    d.text((92, 430), "Kitchen science, explained by a working chef.", font=font(["DejaVuSerif.ttf"], 40), fill=MUTED)
    d.text((92, 520), "howloop.how", font=font(["DejaVuSans-Bold.ttf"], 34), fill=ORANGE)
    og.save(STATIC / "assets" / "og-default.png", optimize=True)
    print("Icons and share image written to site/static/")


if __name__ == "__main__":
    main()
