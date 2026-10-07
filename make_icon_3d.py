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
# Intended brand green per css/styles.css --accent and the make_icon.py comment.
# NOTE (analysis finding): make_icon.py stores BRAND = (0x46,0x72,0x21) which is
# #467221, i.e. R/B swapped vs the documented #217346 = (0x21,0x73,0x46), with G
# off by one (0x72 vs 0x73). BRAND_DARK *does* match its comment (#2F5118).
# The 3D models below use the *intended* colours so the tile matches the app CSS.
BRAND      = (0x21, 0x73, 0x46)   # #217346 -- tile face
BRAND_DARK = (0x2F, 0x51, 0x18)   # #2F5118 -- grid ribs
WHITE      = (0xFF, 0xFF, 0xFF)   # X bars
BRAND_SIDE = (0x1A, 0x5C, 0x38)   # #1a5c38 -- tile sides (from i-brand stroke)

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

def rounded_rect_loop(half, radius, corner_seg=10):
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

    # Cell grid: 2D draws faint dark lines at 1/4, 1/2, 3/4 across the tile.
    # In 3D these become thin raised ribs; each rib is split into 4 segments
    # at the crossings so ribs never overlap each other (the taller X bars sit
    # above, so no boolean cut is needed where they cross).
    grid = Solid("brand_dark")
    lines = [S*f - S/2.0 for f in (0.25, 0.5, 0.75)]
    span = (-half+RADIUS*0.35, half-RADIUS*0.35)  # keep ribs inside corners
    segs = [span[0]] + [L for L in lines] + [span[1]]
    for L in lines:
        # vertical rib: segments between horizontal grid lines
        for k in range(len(segs)-1):
            a, b = segs[k]+GRID_HALF, segs[k+1]-GRID_HALF
            if b-a < S*0.01:
                continue
            add_prism(grid, rect_loop(L-GRID_HALF, -b, L+GRID_HALF, -a),
                      z_face, z_face+GRID_H)
        # horizontal rib
        for k in range(len(segs)-1):
            a, b = segs[k]+GRID_HALF, segs[k+1]-GRID_HALF
            if b-a < S*0.01:
                continue
            add_prism(grid, rect_loop(a, L-GRID_HALF, b, L+GRID_HALF),
                      z_face, z_face+GRID_H)

    # Bold X: two diagonal bars, each a rotated rectangle (convex -> prism).
    # Bar length matches X_REACH squares: end (r,r), half-width w perp offset.
    xmat = Solid("white")
    r, w = X_REACH, X_HALF
    inv = 1.0/math.sqrt(2.0)
    for sx, sy in ((1, 1), (1, -1)):
        dx, dy = sx*inv, sy*inv          # bar direction (unit)
        px, py = -dy, dx                 # perp unit
        ex, ey = dx*r, dy*r
        quad = [(ex+px*w, ey+py*w), (-ex+px*w, -ey+py*w),
                (-ex-px*w, -ey-py*w), (ex-px*w, ey-py*w)]
        add_prism(xmat, quad, z_face, z_face+X_H)
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


