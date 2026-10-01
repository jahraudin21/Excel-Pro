# Generates build/icon.ico (multi-resolution Windows icon) with no third-party deps.
# Pure-stdlib: rasterises each size into an uncompressed 32-bit BMP (BITMAPINFOHEADER
# + BGRA pixel array, bottom-up) and packs them into an ICO container.
#
#   python make_icon.py
#
# Design: a rounded "grid" tile in the app's green, with a white spreadsheet grid
# and a check mark. Stays legible down to 16px because the grid is 2 cells wide and
# the mark is a single bold stroke.

import os
import struct

# BGR + alpha, top-down; flipped per row when written bottom-up into the ICO.
GREEN   = (0x37, 0x7D, 0x22)   # #217D37 -> RGB(33,125,55)
GRID    = (255, 255, 255)      # white
SIZES   = (16, 24, 32, 48, 64, 128, 256)
OUT     = os.path.join("build", "icon.ico")


def _px(x, y, n, grid_l, grid_t, grid_r, grid_b, cell, mark, rad):
    """Return (b,g,r,a) for one pixel of the n x n icon."""
    # ---- rounded-rectangle mask for the tile -------------------------------
    inside = True
    for corner_x, corner_y in ((grid_l + rad, grid_t + rad),
                                (grid_r - rad, grid_t + rad),
                                (grid_l + rad, grid_b - rad),
                                (grid_r - rad, grid_b - rad)):
        in_x = x < corner_x if corner_x == grid_l + rad else x > corner_x
        in_y = y < corner_y if corner_y == grid_t + rad else y > corner_y
        if in_x and in_y:
            if (x - corner_x) ** 2 + (y - corner_y) ** 2 > rad * rad:
                inside = False
    if not inside:
        return (0, 0, 0, 0)

    # ---- white spreadsheet grid -------------------------------------------
    if grid_l < x < grid_r and grid_t < y < grid_b:
        on_v = any(abs(x - gx) <= max(0, cell // 6) for gx in
                   (grid_l + cell, grid_l + 2 * cell, grid_l + 3 * cell))
        on_h = any(abs(y - gy) <= max(0, cell // 6) for gy in
                   (grid_t + cell, grid_t + 2 * cell, grid_t + 3 * cell))
        if on_v or on_h:
            return (GRID[2], GRID[1], GRID[0], 255)
        # ---- check mark over the lower-left cells ---------------------------
        for (mx, my) in mark:
            if (x - mx) ** 2 + (y - my) ** 2 <= max(1.0, cell / 5.0) ** 2:
                return (GRID[2], GRID[1], GRID[0], 255)

    return (GREEN[2], GREEN[1], GREEN[0], 255)


def render(n):
    """Rasterise one size, returning raw BGRA rows top-down."""
    rad = max(2, n * 5 // 100)
    grid_l, grid_t = n * 8 // 100, n * 8 // 100
    grid_r, grid_b = n * 92 // 100, n * 92 // 100
    cell = (grid_r - grid_l) // 4

    # check-mark stroke: short down-stroke then long up-stroke
    scale = cell / 100.0
    ox, oy = grid_l + cell * 1.0, grid_t + cell * 2.0
    mark = []
    for t in range(0, 46, 4):
        mark.append((int(ox + t * scale), int(oy + t * scale)))
    for t in range(0, 92, 4):
        mark.append((int(ox + 46 * scale + t * scale),
                     int(oy + 46 * scale - t * scale)))

    rows = []
    for y in range(n):
        row = bytearray()
        for x in range(n):
            b, g, r, a = _px(x, y, n, grid_l, grid_t, grid_r, grid_b,
                             cell, mark, rad)
            row += bytes((b, g, r, a))
        rows.append(bytes(row))
    return rows


def ico_image(n, rows):
    """Pack one size as a BMP-in-ICO (BITMAPINFOHEADER + BGRA + AND mask)."""
    hdr = struct.pack("<IiiHHIIiiII", 40, n, n * 2, 1, 32, 0, 0, 0, 0, 0, 0)
    pixels = b"".join(reversed(rows))                     # bottom-up
    mask_stride = ((n + 31) // 32) * 4                     # 1bpp, padded to 4B
    and_mask = bytes(mask_stride * n)                     # fully opaque
    return hdr + pixels + and_mask


def main():
    images = [ico_image(n, render(n)) for n in SIZES]
    out = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries, blobs = b"", b""
    for n, img in zip(SIZES, images):
        entries += struct.pack("<BBBBHHII", n if n < 256 else 0,
                               n if n < 256 else 0, 0, 0, 1, 32,
                               len(img), offset)
        offset += len(img)
        blobs += img
    os.makedirs("build", exist_ok=True)
    with open(OUT, "wb") as fh:
        fh.write(out + entries + blobs)
    print("wrote %s (%d bytes, sizes=%s)" % (OUT, os.path.getsize(OUT),
                                              ",".join(map(str, SIZES))))


if __name__ == "__main__":
    main()