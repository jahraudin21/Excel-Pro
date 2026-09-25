"""Generate users.xlsx with Email/Name/Password headers styled dark-blue + white + bold.
Uses only the Python standard library (zipfile + xml) so no openpyxl is needed.
"""
import zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parent / "users.xlsx"

XMLH = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

DARK_BLUE = "1F4E78"  # dark blue fill (Excel theme dark blue)
WHITE = "FFFFFF"

def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))

# --- styles.xml: 2 fonts (normal, bold+white), 3 fills (none, gray125, dark-blue solid) ---
styles = (XMLH + '<styleSheet xmlns="%s">' % NS
    + '<fonts count="2">'
    + '<font><sz val="11"/><name val="Calibri"/></font>'
    + '<font><b/><color rgb="FF%s"/>' % WHITE
    + '<sz val="11"/><name val="Calibri"/></font>'
    + '</fonts>'
    + '<fills count="3">'
    + '<fill><patternFill patternType="none"/></fill>'
    + '<fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid">'
    + '<fgColor rgb="FF%s"/>' % DARK_BLUE
    + '<bgColor indexed="64"/>'
    + '</patternFill></fill>'
    + '</fills>'
    + '<borders count="1"><border/></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0"/></cellStyleXfs>'
    + '<cellXfs count="2">'
    + '<xf numFmtId="0" fontId="0" fillId="0" applyFont="1"/>'
    # index 1 = header style: bold + white font, dark-blue solid fill
    + '<xf numFmtId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/>'
    + '</cellXfs></styleSheet>')

def cell_inline(ref, value, style_idx=None):
    s = (' s="%d"' % style_idx) if style_idx else ''
    return ('<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>'
            % (ref, s, esc(value)))

sheet1 = (XMLH + '<worksheet xmlns="%s"><sheetData>' % NS
    + '<row r="1">'
    + cell_inline("A1", "Email", 1)
    + cell_inline("B1", "Name", 1)
    + cell_inline("C1", "Password", 1)
    + '</row>'
    + '</sheetData></worksheet>')

workbook = (XMLH + '<workbook xmlns="%s" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>'
            '<calcPr fullCalcOnLoad="1"/></workbook>' % NS)

content_types = (XMLH + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '</Types>')

rels = (XMLH + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '</Relationships>')

wb_rels = (XMLH + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>')

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types.encode("utf-8"))
    z.writestr("_rels/.rels", rels.encode("utf-8"))
    z.writestr("xl/workbook.xml", workbook.encode("utf-8"))
    z.writestr("xl/_rels/workbook.xml.rels", wb_rels.encode("utf-8"))
    z.writestr("xl/styles.xml", styles.encode("utf-8"))
    z.writestr("xl/worksheets/sheet1.xml", sheet1.encode("utf-8"))

print("wrote", OUT, OUT.stat().st_size, "bytes")
# quick verify
with zipfile.ZipFile(OUT) as z:
    print("parts:", z.namelist())
    print("sheet1:", z.read("xl/worksheets/sheet1.xml").decode()[:600])
    print("styles:", z.read("xl/styles.xml").decode()[:800])
