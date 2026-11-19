#!/usr/bin/env python3
"""Scale a headless screenshot PNG into a JPEG that fits the gate's caps:
long side at most 1280, short side at least 480, at most 256 KiB.
Usage: shots-convert.py <in.png> <out.jpg> <width> <height>"""
import sys
from PIL import Image

src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert("RGB")
if im.size != (w, h):
    im = im.resize((w, h), Image.LANCZOS)
for quality in (88, 82, 76, 70, 62, 55):
    im.save(dst, "JPEG", quality=quality, optimize=True)
    import os
    size = os.path.getsize(dst)
    print(f"  {dst}: {im.size[0]}x{im.size[1]} quality={quality} bytes={size}")
    if size <= 256 * 1024:
        break
else:
    print(f"WARNING: {dst} still over 256 KiB at quality 55")
