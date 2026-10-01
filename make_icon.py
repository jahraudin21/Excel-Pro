# Generates build/icon.ico (multi-resolution Windows icon) with no third-party deps.
# Pure-stdlib: rasterises each size into an uncompressed 32-bit BMP (BITMAPINFOHEADER
# + BGRA pixel array, bottom-up) and packs them into an ICO container.
#
#   npm run make:icon          (or: python make_icon.py)
#
# Design: an Excel-inspired tile -- the signature spreadsheet green, a faint cell
# grid, and a bold white "X". It deliberately does NOT reproduce Microsoft's logo
# (that would be a trademark problem in a distinct product); it borrows only the
# colour and the grid idea, which is what makes a spreadsheet read as a spreadsheet.
#
# Rendering is 4x supersampled and box-filtered down, which is what gives the
# diagonal X strokes clean anti-aliased edges instead of visible stair-stepping.

import os
import struct

# ---- palette ---------------------------------------------------------------
# Excel's signature brand green (#217346), stored as RGB.
BRAND      = (0x46, 0x72, 0x21)   # #217346
BRAND_DARK = (0x2F, 0x51, 0x18)   # #2F5118 -- grid lines
WHITE      = (0xFF, 0xFF, 0xFF)

SIZES = (16, 24, 32, 48, 64, 128, 256)
SS    = 4                       # supersampling factor
OUT   = os.path.join("build", "icon.ico")


def _inside_rounded(px, py, n, rad):
    """Rounded-square mask for a tile of side n, at sub-pixel point (px, py)."""
    m = n * 3 / 100.0                     # small margin so the tile isn't flush
    lo, hi = m, n - m
    if px < lo or px > hi or py < lo or py > hi:
        return False
    # Only the four corner squares can fall outside the rounded boundary.
    for cx, cy in ((lo + rad, lo + rad), (hi - rad, lo + rad),
                   (lo + rad, hi - rad), (hi - rad, hi - rad)):
        inside_x = px < cx if cx == lo + rad else px > cx
        inside_y = py < cy if cy == lo + rad else py > cy
        if inside_x and inside_y:
            if (px - cx) ** 2 + (py - cy) ** 2 > rad * rad:
                return False
    return True


def _coverage(x, y, n):
    """Anti-aliased alpha (0.0..1.0) for pixel (x, y) of the n x n tile."""
    rad = n * 6 // 100
    hits = 0
    for sy in range(SS):
        for sx in range(SS):
            if _inside_rounded(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, n, rad):
                hits += 1
    return hits / float(SS * SS)


def _dist_to_segment(px, py, ax, ay, bx, by):
    """Distance from (px, py) to the line segment (ax, ay)-(bx, by)."""
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    seg = vx * vx + vy * vy
    t = 0.0 if seg == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / seg))
    dx, dy = wx - t * vx, wy - t * vy
    return (dx * dx + dy * dy) ** 0.5


def _colour(px, py, n):
    """Return (r, g, b) at a point known to be inside the tile."""
    # ---- bold white X ------------------------------------------------------
    # The X spans most of the tile so it reads as an X at 16px. It is drawn
    # BEFORE (i.e. under) the grid in paint order below: the stroke punches a
    # gap in the grid lines, so the diagonals stay continuous instead of being
    # chopped into disconnected dashes.
    half = n * 6.5 / 100.0                # stroke half-width
    reach = n * 0.34                      # half-extent of the diagonals

    def _x_stroke_at(qx, qy):
        if abs(qx - n / 2.0) > reach or abs(qy - n / 2.0) > reach:
            return False
        c = n / 2.0
        return min(_dist_to_segment(qx, qy, c - reach, c - reach,
                                    c + reach, c + reach),
                   _dist_to_segment(qx, qy, c + reach, c - reach,
                                    c - reach, c + reach)) <= half

    # ---- faint cell grid (the "spreadsheet" cue) --------------------------
    lw = max(0.7, n * 1.3 / 100.0)        # grid line half-width
    on_grid = False
    for f in (0.25, 0.5, 0.75):
        g = n * f
        if abs(px - g) <= lw or abs(py - g) <= lw:
            on_grid = True
            break

    if on_grid and not _x_stroke_at(px, py):
        return BRAND_DARK

    if _x_stroke_at(px, py):
        return WHITE

    return BRAND


def render(n):
    """Rasterise one size -> list of top-down BGRA rows."""
    rows = []
    for y in range(n):
        row = bytearray()
        for x in range(n):
            a = _coverage(x, y, n)
            if a <= 0.0:
                row += bytes((0, 0, 0, 0))
                continue
            r, g, b = _colour(x + 0.5, y + 0.5, n)
            row += bytes((b, g, r, int(round(255 * a))))
        rows.append(bytes(row))
    return rows


def ico_image(n, rows):
    """Pack one size as a BMP-in-ICO (BITMAPINFOHEADER + BGRA + AND mask)."""
    hdr = struct.pack("<IiiHHIIiiII", 40, n, n * 2, 1, 32, 0, 0, 0, 0, 0, 0)
    pixels = b"".join(reversed(rows))                     # ICO wants bottom-up
    mask_stride = ((n + 31) // 32) * 4                    # 1bpp AND mask, 4B pad
    and_mask = bytes(mask_stride * n)                    # alpha channel governs
    return hdr + pixels + and_mask


def main():
    images = [ico_image(n, render(n)) for n in SIZES]
    header = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries, blobs = b"", b""
    for n, img in zip(SIZES, images):
        entries += struct.pack("<BBBBHHII",
                               n if n < 256 else 0, n if n < 256 else 0,
                               0, 0, 1, 32, len(img), offset)
        offset += len(img)
        blobs += img
    os.makedirs("build", exist_ok=True)
    with open(OUT, "wb") as fh:
        fh.write(header + entries + blobs)
    print("wrote %s (%d bytes, sizes=%s)"
          % (OUT, os.path.getsize(OUT), ",".join(map(str, SIZES))))


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()