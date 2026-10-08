"""Export the 256px 2D icon render to build/icon-2d-256.png (pure stdlib)."""
import struct
import zlib
import make_icon


def _chunk(ctype, data):
    return (struct.pack(">I", len(data)) + ctype + data
            + struct.pack(">I", zlib.crc32(ctype + data) & 0xFFFFFFFF))


def main():
    n = 256
    rows = make_icon.render(n)
    raw = bytearray()
    for y in range(n):
        raw.append(0)  # filter byte: none
        for x in range(n):
            b, g, r, a = rows[y][x * 4:x * 4 + 4]
            raw += bytes((r, g, b, a))
    ihdr = struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr)
           + _chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + _chunk(b"IEND", b""))
    with open("build/icon-2d-256.png", "wb") as fh:
        fh.write(png)
    print("wrote build/icon-2d-256.png (%d bytes)" % len(png))


if __name__ == "__main__":
    main()
