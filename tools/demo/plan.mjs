// Simple demo floor plan as a vector PDF (A4 landscape, 1:100) with room stamps.
import { writeFileSync } from 'node:fs'

const PW = 842, PH = 595
const M = 28.3465 // 1 m at 1:100 in pt
const X0 = 70, Y0 = 95 // top-left of the building on the page (top-down)
const px = (m) => X0 + m * M
const py = (m) => PH - (Y0 + m * M) // PDF is bottom-up

const ops = []
const line = (w, x1, y1, x2, y2) => ops.push(`${w} w ${px(x1).toFixed(2)} ${py(y1).toFixed(2)} m ${px(x2).toFixed(2)} ${py(y2).toFixed(2)} l S`)
const enc = (s) => s.replace(/[\\()]/g, (c) => '\\' + c)
const text = (font, size, xm, ym, s) => ops.push(`BT /${font} ${size} Tf ${px(xm).toFixed(2)} ${py(ym).toFixed(2)} Td (${enc(s)}) Tj ET`)
const textPt = (font, size, x, y, s) => ops.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${enc(s)}) Tj ET`)

// walls: [x1, y1, x2, y2] in metres; openings are left out as gaps
const L = 24, B = 12
const OUTER = 0.36, INNER = 0.14
// outer walls with window gaps drawn afterwards
ops.push('0 0 0 RG 0 0 0 rg 0 J')
line(OUTER * M, 0, 0, L, 0)
line(OUTER * M, L, 0, L, B)
line(OUTER * M, L, B, 0, B)
line(OUTER * M, 0, B, 0, 0)

// windows: white gap with a thin double line
function windowH(x1, x2, y) {
	ops.push('1 1 1 RG'); line(OUTER * M - 1.2, x1, y, x2, y); ops.push('0 0 0 RG')
	line(0.5, x1, y - 0.06, x2, y - 0.06); line(0.5, x1, y + 0.06, x2, y + 0.06)
	line(0.8, x1, y - 0.18, x1, y + 0.18); line(0.8, x2, y - 0.18, x2, y + 0.18)
}
function windowV(y1, y2, x) {
	ops.push('1 1 1 RG'); line(OUTER * M - 1.2, x, y1, x, y2); ops.push('0 0 0 RG')
	line(0.5, x - 0.06, y1, x - 0.06, y2); line(0.5, x + 0.06, y1, x + 0.06, y2)
	line(0.8, x - 0.18, y1, x + 0.18, y1); line(0.8, x - 0.18, y2, x + 0.18, y2)
}
for (const [a, b] of [[1.5, 4.5], [7.5, 10.5], [13, 15.5], [16, 18.5], [20, 23]]) windowH(a, b, 0)
for (const [a, b] of [[1.5, 4.5], [5, 7], [9, 12.5]]) windowH(a, b, B)
windowV(1.5, 3.5, 0); windowV(8.5, 10.5, 0); windowV(1.5, 3.5, L)

// corridor walls (y 5 and 7) with door gaps, partitions
const doorsNorth = [[4.4, 5.4], [10.4, 11.4], [17.4, 18.4], [22.4, 23.4]]
const doorsSouth = [[6.6, 7.6], [12.6, 13.6], [15.2, 16.2], [18.2, 19.2], [20.6, 21.6]]
function wallWithGaps(y, gaps) {
	let x = 0
	for (const [a, b] of gaps) { line(INNER * M, x, y, a, y); x = b }
	line(INNER * M, x, y, L, y)
}
wallWithGaps(5, doorsNorth)
wallWithGaps(7, doorsSouth)
for (const x of [6, 12, 19]) line(INNER * M, x, 0, x, 5)
for (const x of [8, 14, 17, 20]) line(INNER * M, x, 7, x, B)

// door leaves and swings (quarter circle as a Bézier)
function door(a, b, y, dir) {
	const r = (b - a) * M, k = 0.5523 * r
	const hx = px(a), hy = py(y), s = dir // +1 opens into the room above (north), -1 below
	ops.push(`0.6 w ${hx.toFixed(2)} ${hy.toFixed(2)} m ${hx.toFixed(2)} ${(hy + s * r).toFixed(2)} l S`)
	ops.push(`0.4 w ${(hx + r).toFixed(2)} ${hy.toFixed(2)} m ${(hx + r).toFixed(2)} ${(hy + s * k).toFixed(2)} ${(hx + k).toFixed(2)} ${(hy + s * r).toFixed(2)} ${hx.toFixed(2)} ${(hy + s * r).toFixed(2)} c S`)
}
for (const [a, b] of doorsNorth) door(a, b, 5, 1)
for (const [a, b] of doorsSouth) door(a, b, 7, -1)

// stairs: treads
for (let i = 0; i <= 12; i++) line(0.4, 20.4, 8.1 + i * 0.3, 23.6, 8.1 + i * 0.3)
line(0.6, 22, 8.1, 22, 11.7)

// room stamps: name, area below
const rooms = [
	['Office 1', 0.5, 2.2, 6 * 5], ['Office 2', 6.5, 2.2, 6 * 5], ['Meeting room', 12.5, 2.2, 7 * 5],
	['Kitchen', 19.5, 2.2, 5 * 5], ['Corridor', 1, 6.15, 24 * 2], ['Corner office', 0.5, 9.2, 8 * 5],
	['Office 3', 8.5, 9.2, 6 * 5], ['WC', 14.5, 9.2, 3 * 5], ['Storage', 17.3, 9.2, 3 * 5],
]
for (const [name, x, y, area] of rooms) {
	text('F2', 9, x, y, name)
	text('F1', 8, x, y + 0.4, `A: ${area.toFixed(2)} m\xb2`)
}
text('F1', 8, 20.5, 7.75, 'Stairs')

// scale bar and title block
const sx = px(0), sy = PH - 520
for (let i = 0; i < 5; i++) ops.push(`${i % 2 ? '1 1 1' : '0 0 0'} rg 0.5 w ${(sx + i * M).toFixed(2)} ${sy} ${M.toFixed(2)} 4 re B`)
ops.push('0 0 0 rg')
textPt('F1', 7, sx, sy - 10, '0'); textPt('F1', 7, sx + 5 * M - 6, sy - 10, '5 m')
const tx = 600, ty = 40
ops.push(`0.6 w ${tx} ${ty} 202 52 re S`)
textPt('F2', 10, tx + 8, ty + 36, 'Office floor - 2nd floor')
textPt('F1', 8, tx + 8, ty + 22, 'Floor plan 1:100')
textPt('F1', 8, tx + 8, ty + 10, 'Demo data for Photosphere Tours')

// assemble the PDF
const content = ops.join('\n')
const objects = [
	'<< /Type /Catalog /Pages 2 0 R >>',
	'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
	`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
	`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
	'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
	'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
]
let pdf = '%PDF-1.4\n'
const offsets = []
objects.forEach((o, i) => { offsets.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${o}\nendobj\n` })
const xref = Buffer.byteLength(pdf, 'latin1')
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
writeFileSync(process.argv[2] || 'out/Floor plan 2nd floor.pdf', Buffer.from(pdf, 'latin1'))
console.log('written')
