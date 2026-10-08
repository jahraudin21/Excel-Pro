# Converts the 2D app icon (see make_icon.py / build/icon.ico) into real 3D models.
# Pure-stdlib: writes Wavefront OBJ (+MTL), binary STL and binary glTF (GLB)
# with no third-party deps (PIL/numpy/three not required to run this script).
#
#   python make_icon_3d.py
#   -> build/icon-3d.obj + build/icon-3d.mtl   (colour, for Blender/Maya/three.js)
#   -> build/icon-3d.stl                       (single solid, for 3D printing/slicers)
#   -> build/icon-3d.glb                       (PBR materials, for web/three.js/Windows 3D Viewer)
#
# Design mapping (2D -> 3D), mirroring make_icon.py paint order in Z:
#   tile body  (BRAND green rounded square) -> extruded prism, depth D
#   cell grid  (BRAND_DARK thin lines)      -> thin raised ribs just above the tile face
#   bold X     (WHITE diagonals)            -> taller raised bars on top, so the
#                                              diagonals stay continuous over the grid
#                                              exactly as the 2D paint order does.
#
# Coordinate system: icon space normalised to S=2.0 wide, centred at origin,
# X right, Y up (2D Y-down is flipped), Z out of the screen (extrusion axis).
# All parameters below are the same fractions make_icon.py uses.

import os
import struct
import json
import math

# ---- palette ----------------------------------------------------------------
# SAME-TO-SAME with the shipped 2D icon: these byte values are sampled from
# make_icon.render(256) BGRA output -- tile BGRA [33,114,70] i.e. RGB #214672,
# grid BGRA [24,81,47] i.e. RGB #183118. Keep in lock-step with make_icon.py;
# do NOT "correct" them to the #217346 comment (that is a different colour).
BRAND      = (0x46, 0x72, 0x21)   # sampled 2D tile pixel -- build/icon.ico body
BRAND_DARK = (0x2F, 0x51, 0x18)   # sampled 2D grid pixel -- build/icon.ico grid
WHITE      = (0xFF, 0xFF, 0xFF)   # X bars
BRAND_SIDE = (0x38, 0x5C, 0x1C)   # tile sides: BRAND darkened ~20% for depth cue

S = 2.0            # tile outer extent (icon 0..n maps to -S/2..+S/2)
MARGIN = 0.03 * S  # 3% margin so the tile isn't flush (mirrors make_icon.py)
RADIUS = 0.06 * S  # 6% corner radius
X_HALF = 0.065 * S       # stroke half-width (6.5%)
X_REACH = 0.34 * S       # half-extent of the diagonals
GRID_HALF = 0.013 * S    # grid line half-width (1.3%)
DEPTH = 0.22 * S         # tile extrusion depth
GRID_H = 0.018 * S       # grid rib height above tile face
X_H = 0.05 * S           # X bar height above tile face (taller -> stays on top)
BEVEL = 0.012 * S        # small front bevel step (visual richness, cheap)

OUT_DIR = "build"

# ---- mesh helpers ------------------------------------------------------------
# Every solid is a convex prism: a CCW (x, y) loop extruded from z0 to z1.
# Convexity lets top/bottom caps use a triangle fan; sides are quads -> 2 tris.
# Flat normals are computed per triangle. Verts are intentionally NOT shared
# between faces so OBJ/STL/GLB all get clean faceted shading.

class Solid:
    def __init__(self, mat):
        self.mat = mat
        self.tris = []  # each tri: ((x,y,z)*3, (nx,ny,nz))

def _tri_normal(a, b, c):
    ux, uy, uz = b[0]-a[0], b[1]-a[1], b[2]-a[2]
    vx, vy, vz = c[0]-a[0], c[1]-a[1], c[2]-a[2]
    nx, ny, nz = uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx
    L = math.sqrt(nx*nx+ny*ny+nz*nz)
    if L == 0:
        return (0.0, 0.0, 1.0)
    return (nx/L, ny/L, nz/L)

def _add_tri(solid, a, b, c):
    solid.tris.append((a, b, c, _tri_normal(a, b, c)))

def add_prism(solid, loop, z0, z1):
    n = len(loop)
    bot = [(x, y, z0) for (x, y) in loop]
    top = [(x, y, z1) for (x, y) in loop]
    for i in range(1, n-1):          # bottom cap (faces -Z): reverse winding
        _add_tri(solid, bot[0], bot[i+1], bot[i])
    for i in range(1, n-1):          # top cap (faces +Z)
        _add_tri(solid, top[0], top[i], top[i+1])
    for i in range(n):               # side walls (outward)
        j = (i+1) % n
        _add_tri(solid, bot[i], bot[j], top[j])
        _add_tri(solid, bot[i], top[j], top[i])

def rounded_rect_loop(half, radius, corner_seg=64):
    pts = []
    corners = [(half-radius, half-radius, 0),
               (-(half-radius), half-radius, 90),
               (-(half-radius), -(half-radius), 180),
               (half-radius, -(half-radius), 270)]
    for cx, cy, start in corners:
        for k in range(corner_seg+1):
            a = math.radians(start + 360.0*k/corner_seg*0.25)
            pts.append((cx+radius*math.cos(a), cy+radius*math.sin(a)))
    return pts

def rect_loop(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

# ---- 2D -> 3D geometry ---------------------------------------------------------
# Mirrors make_icon.py: same margin/radius/X/grid fractions, Y flipped to Y-up.

def _build_solids():
    half = S/2.0 - MARGIN
    z_face = DEPTH
    tile = Solid("brand_face")
    tile_side = Solid("brand_side")
    # Main body: rounded-square prism from z=0 to the face.
    add_prism(tile_side, rounded_rect_loop(half, RADIUS), 0.0, z_face - BEVEL)
    # Thin bevel step in face colour gives a highlight edge on the front.
    add_prism(tile, rounded_rect_loop(half, RADIUS), z_face - BEVEL, z_face)

    # Cell grid: 2D draws faint dark lines at 1/4, 1/2, 3/4 across the WHOLE tile
    # (edge to edge, clipped only by the rounded-tile mask). Same-to-same: each
    # rib runs the full tile span (-half..half); segmentation at crossings only
    # avoids rib-on-rib overlap (the taller X bars sit above, no cut needed).
    grid = Solid("brand_dark")
    lines = [S*f - S/2.0 for f in (0.25, 0.5, 0.75)]
    span = (-half, half)  # full span like the 2D lines
    segs = [span[0]] + [L for L in lines] + [span[1]]
    # Vertical ribs run CONTINUOUS full-span (like the 2D lines: crossings
    # stay grid-coloured); horizontal ribs are segmented between them.
    # No overlaps, no holes -- exactly the 2D paint result.
    for L in lines:
        add_prism(grid, rect_loop(L-GRID_HALF, span[0], L+GRID_HALF, span[1]),
                  z_face, z_face+GRID_H)
    for L in lines:
        for k in range(len(segs)-1):
            a = segs[k] if k == 0 else segs[k]+GRID_HALF
            b = segs[k+1] if k == len(segs)-2 else segs[k+1]-GRID_HALF
            if b-a < S*0.01:
                continue
            add_prism(grid, rect_loop(a, L-GRID_HALF, b, L+GRID_HALF),
                      z_face, z_face+GRID_H)

    # Bold X: two diagonal bars. Same-to-same with _x_stroke_at: the 2D stroke
    # is gated to the reach-square AND within half-width of a diagonal, so
    # each bar is the rotated rect CLIPPED to the reach-square (Sutherland-
    # Hodgman against |x|,|y| <= reach). Tips touch the square corners; flat
    # tip overhang past the square edges is cut exactly like the 2D gate.
    xmat = Solid("white")
    r, w = X_REACH*math.sqrt(2.0), X_HALF
    inv = 1.0/math.sqrt(2.0)
    def _clip(poly, axis, bound, keep_le):
        out = []
        n = len(poly)
        for i in range(n):
            cur = poly[i]
            prv = poly[i-1]
            cv = cur[axis]
            pv = prv[axis]
            ci = cv <= bound if keep_le else cv >= bound
            pi = pv <= bound if keep_le else pv >= bound
            if ci:
                if not pi:
                    t = (bound-pv)/(cv-pv)
                    out.append((prv[0]+t*(cur[0]-prv[0]),
                                prv[1]+t*(cur[1]-prv[1])))
                out.append(cur)
            elif pi:
                t = (bound-pv)/(cv-pv)
                out.append((prv[0]+t*(cur[0]-prv[0]),
                            prv[1]+t*(cur[1]-prv[1])))
        return out
    for sx, sy in ((1, 1), (1, -1)):
        dx, dy = sx*inv, sy*inv          # bar direction (unit)
        px, py = -dy, dx                 # perp unit
        ex, ey = dx*r, dy*r
        # perimeter order: tip-cap, flank, tip-cap, flank; enforce CCW in
        # code (add_prism fans caps assuming CCW for +Z top faces).
        quad = [(ex+px*w, ey+py*w), (ex-px*w, ey-py*w),
                (-ex-px*w, -ey-py*w), (-ex+px*w, -ey+py*w)]
        g = X_REACH
        poly = quad
        for axis, bound, keep in ((0, g, True), (0, -g, False),
                                  (1, g, True), (1, -g, False)):
            poly = _clip(poly, axis, bound, keep)
            if len(poly) < 3:
                break
        if len(poly) >= 3:
            # dedupe: S-H emits the corner point twice when an edge passes
            # exactly through it; duplicates make degenerate fan triangles
            # with bogus (0,0,1) normals that cover wrong pixels.
            clean = []
            for p in poly:
                if not clean or abs(p[0]-clean[-1][0]) > 1e-9 or abs(p[1]-clean[-1][1]) > 1e-9:
                    clean.append(p)
            if len(clean) >= 3 and abs(clean[0][0]-clean[-1][0]) < 1e-9 and abs(clean[0][1]-clean[-1][1]) < 1e-9:
                clean.pop()
            poly = clean
        if len(poly) >= 3:
            area2 = sum(poly[i][0]*poly[(i+1) % len(poly)][1]
                        - poly[(i+1) % len(poly)][0]*poly[i][1]
                        for i in range(len(poly)))
            if area2 < 0:
                poly = poly[::-1]  # enforce CCW for +Z cap normals
            add_prism(xmat, poly, z_face, z_face+X_H)
    return [tile_side, tile, grid, xmat]


# ---- exporters: OBJ(+MTL) / binary STL / binary glTF (GLB) ----------------------

MATS = {
    "brand_face": ((BRAND[0]/255.0, BRAND[1]/255.0, BRAND[2]/255.0), 0.55, 0.35),
    "brand_side": ((BRAND_SIDE[0]/255.0, BRAND_SIDE[1]/255.0, BRAND_SIDE[2]/255.0), 0.6, 0.3),
    "brand_dark": ((BRAND_DARK[0]/255.0, BRAND_DARK[1]/255.0, BRAND_DARK[2]/255.0), 0.65, 0.25),
    "white":      ((1.0, 1.0, 1.0), 0.4, 0.5),
}

def write_obj(solids, obj_path):
    mtl_path = os.path.splitext(obj_path)[0] + ".mtl"
    with open(mtl_path, "w", encoding="utf-8") as fh:
        fh.write("# Excel-Pro icon 3D materials (from make_icon_3d.py)\n")
        for name, (rgb, rough, metal) in MATS.items():
            fh.write("newmtl %s\nKd %.4f %.4f %.4f\n" % (name, rgb[0], rgb[1], rgb[2]))
            fh.write("Ns %.1f\nd %.2f\nillum 2\n\n" % ((1.0-rough)*200.0+10.0, 1.0))
    with open(obj_path, "w", encoding="utf-8") as fh:
        fh.write("# Excel-Pro icon extruded to 3D (from make_icon_3d.py)\n")
        fh.write("mtllib %s\n" % os.path.basename(mtl_path))
        vi = 1
        for s in solids:
            fh.write("o %s\nusemtl %s\n" % (s.mat, s.mat))
            for (a, b, c, n) in s.tris:
                for p in (a, b, c):
                    fh.write("v %.6f %.6f %.6f\n" % p)
                fh.write("vn %.5f %.5f %.5f\n" % n)
                fh.write("f %d//%d %d//%d %d//%d\n" % (vi, vi, vi+1, vi+1, vi+2, vi+2))
                vi += 3

def write_stl(solids, stl_path):
    n = sum(len(s.tris) for s in solids)
    with open(stl_path, "wb") as fh:
        fh.write(b"Excel-Pro icon 3D" + b"\0"*(80-17))
        fh.write(struct.pack("<I", n))
        for s in solids:
            for (a, b, c, nn) in s.tris:
                fh.write(struct.pack("<3f", *nn))
                fh.write(struct.pack("<3f", *a))
                fh.write(struct.pack("<3f", *b))
                fh.write(struct.pack("<3f", *c))
                fh.write(struct.pack("<H", 0))


def write_glb(solids, glb_path):
    # One POSITION view + one NORMAL view per material; one primitive each.
    bin_blob, views, accs, matdefs = b"", [], [], []
    for mi, s in enumerate(solids):
        rgb, rough, metal = MATS[s.mat]
        P, N = [], []
        for (a, b, c, nn) in s.tris:
            for p in (a, b, c):
                P += [p[0], p[1], p[2]]
            for _ in range(3):
                N += [nn[0], nn[1], nn[2]]
        pb = struct.pack("<%df" % len(P), *P)
        nb = struct.pack("<%df" % len(N), *N)
        p_off, n_off = len(bin_blob), len(bin_blob) + len(pb)
        bin_blob += pb + nb
        views.append({"buffer": 0, "byteOffset": p_off, "byteLength": len(pb)})
        views.append({"buffer": 0, "byteOffset": n_off, "byteLength": len(nb)})
        cnt = len(P)//3
        mins = [min(P[k] for k in range(j, len(P), 3)) for j in range(3)]
        maxs = [max(P[k] for k in range(j, len(P), 3)) for j in range(3)]
        accs.append({"bufferView": mi*2, "componentType": 5126,
                     "count": cnt, "type": "VEC3", "min": mins, "max": maxs})
        accs.append({"bufferView": mi*2+1, "componentType": 5126,
                     "count": cnt, "type": "VEC3"})
        matdefs.append({"name": s.mat, "pbrMetallicRoughness": {
            "baseColorFactor": [rgb[0], rgb[1], rgb[2], 1.0],
            "metallicFactor": metal, "roughnessFactor": rough}})
    while len(bin_blob) % 4:
        bin_blob += b"\0"
    doc = {"asset": {"version": "2.0", "generator": "Excel-Pro make_icon_3d.py"},
           "scene": 0, "scenes": [{"nodes": [0]}],
           "nodes": [{"mesh": 0, "name": "excel-pro-icon"}],
           "meshes": [{"primitives": [
               {"attributes": {"POSITION": mi*2, "NORMAL": mi*2+1},
                "material": mi} for mi in range(len(solids))]}],
           "materials": matdefs, "accessors": accs, "bufferViews": views,
           "buffers": [{"byteLength": len(bin_blob)}]}
    js = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    while len(js) % 4:
        js += b" "
    total = 12 + 8 + len(js) + 8 + len(bin_blob)
    with open(glb_path, "wb") as fh:
        fh.write(struct.pack("<III", 0x46546C67, 2, total))
        fh.write(struct.pack("<II", len(js), 0x4E4F534A))
        fh.write(js)
        fh.write(struct.pack("<II", len(bin_blob), 0x004E4942))
        fh.write(bin_blob)


# ---- same-to-same front-view check --------------------------------------------
# Orthographic top-face rasteriser (pixel-exact, no lighting): for each output
# pixel, take the topmost +Z-facing triangle covering the pixel centre and
# paint its material colour. Returns (match_rate, diff_count, total_opaque)
# against make_icon.render(n) so "same to same" is a measured number.

def _point_in_tri(px, py, a, b, c):
    d1 = (px-b[0])*(a[1]-b[1]) - (a[0]-b[0])*(py-b[1])
    d2 = (px-c[0])*(b[1]-c[1]) - (b[0]-c[0])*(py-c[1])
    d3 = (px-a[0])*(c[1]-a[1]) - (c[0]-a[0])*(py-a[1])
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)

def front_view_match(n=256):
    import make_icon as m2
    solids = _build_solids()
    tops = []  # (z, mat, tri) for +Z-facing tris, topmost (max z) first
    for s in solids:
        for (a, b, c, nn) in s.tris:
            if nn[2] > 0.9:
                tops.append((max(a[2], b[2], c[2]), s.mat, (a, b, c)))
    tops.sort(key=lambda t: -t[0])
    rows2d = m2.render(n)
    rad = n*6//100  # same rounded-corner radius as make_icon._coverage
    mat_rgb = {"brand_face": BRAND, "brand_side": BRAND,
               "brand_dark": BRAND_DARK, "white": WHITE}
    match, diff, opaque = 0, 0, 0
    for y in range(n):
        for x in range(n):
            b2, g2, r2, a2 = rows2d[y][x*4:x*4+4]
            if a2 < 128:
                continue
            opaque += 1
            # 3D world coords of pixel centre (Y-up, centred, S wide)
            wx = (x+0.5)/n*S - S/2.0
            wy = S/2.0 - (y+0.5)/n*S
            hit = None
            for (_, mat, (a, b, c)) in tops:  # sorted topmost-first
                if _point_in_tri(wx, wy, a, b, c):
                    hit = mat
                    break
            if hit == "brand_dark":
                # Same-to-same: ribs only count where the 2D tile mask exists
                # (rounded corners clip both). Mirror _inside_rounded at centre.
                m = n*3/100.0
                qx, qy = x+0.5, y+0.5
                inside = m <= qx <= n-m and m <= qy <= n-m
                if inside:
                    for cx, cy in ((m+rad, m+rad), (n-m-rad, m+rad),
                                   (m+rad, n-m-rad), (n-m-rad, n-m-rad)):
                        ox = qx < cx if cx == m+rad else qx > cx
                        oy = qy < cy if cy == m+rad else qy > cy
                        if ox and oy and (qx-cx)**2+(qy-cy)**2 > rad*rad:
                            inside = False
                if not inside:
                    hit = "brand_face"
            r3, g3, b3 = mat_rgb[hit] if hit else (0, 0, 0)
            if (r3, g3, b3) == (r2, g2, b2):
                match += 1
            else:
                diff += 1
    return (match/opaque if opaque else 0.0, diff, opaque)


def main():
    solids = _build_solids()
    ntris = sum(len(s.tris) for s in solids)
    os.makedirs(OUT_DIR, exist_ok=True)
    obj = os.path.join(OUT_DIR, "icon-3d.obj")
    stl = os.path.join(OUT_DIR, "icon-3d.stl")
    glb = os.path.join(OUT_DIR, "icon-3d.glb")
    write_obj(solids, obj)
    write_stl(solids, stl)
    write_glb(solids, glb)
    print("2D icon -> 3D: %d tris across %d parts" % (ntris, len(solids)))
    for p in (obj, os.path.splitext(obj)[0]+".mtl", stl, glb):
        print("wrote %s (%d bytes)" % (p, os.path.getsize(p)))


if __name__ == "__main__":
    main()


