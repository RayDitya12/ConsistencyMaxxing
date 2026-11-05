import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Geometri yang sama persis dengan public/icons/app-icon.svg, hanya dalam bentuk piksel.
// Android dan iOS menuntut PNG untuk ikon pasang, jadi SVG saja tidak cukup.
const GRID = [
  [64, 64],
  [204, 64],
  [64, 204],
  [344, 64],
  [64, 344],
  [204, 344],
  [344, 204],
  [344, 344],
]
const ACCENT = [204, 204]
const CELL = 104
const STROKE = 14
const BG = [0xf2, 0xf2, 0xf0]
const INK = [0x11, 0x11, 0x11]
const ORANGE = [0xe8, 0x54, 0x0c]

function render(size) {
  const ss = 4
  const total = ss * ss
  const cells = [...GRID, ACCENT]
  const data = Buffer.alloc(size * size * 3)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let ink = 0
      let orange = 0
      for (let oy = 0; oy < ss; oy++) {
        for (let ox = 0; ox < ss; ox++) {
          const sx = ((px * ss + ox) / (size * ss)) * 512
          const sy = ((py * ss + oy) / (size * ss)) * 512
          for (const [x0, y0] of cells) {
            if (sx < x0 || sx > x0 + CELL || sy < y0 || sy > y0 + CELL) continue
            const filled = x0 === ACCENT[0] && y0 === ACCENT[1]
            const band =
              sx - x0 <= STROKE ||
              x0 + CELL - sx <= STROKE ||
              sy - y0 <= STROKE ||
              y0 + CELL - sy <= STROKE
            if (filled) orange++
            else if (band) ink++
          }
        }
      }
      const aO = Math.min(1, orange / total)
      const aI = Math.min(1 - aO, ink / total)
      const mix = (c) => BG[c] * (1 - aI - aO) + INK[c] * aI + ORANGE[c] * aO
      const i = (py * size + px) * 3
      data[i] = Math.round(mix(0))
      data[i + 1] = Math.round(mix(1))
      data[i + 2] = Math.round(mix(2))
    }
  }
  return data
}

function chunk(type, bytes) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(bytes.length)
  const body = Buffer.concat([Buffer.from(type), bytes])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

let TABLE = null
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      TABLE[i] = c
    }
  }
  let c = ~0
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return ~c >>> 0
}

function png(size, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0
    rgb.copy(raw, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = new URL('../public/icons/', import.meta.url)
const targets = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
]
for (const [name, size] of targets) {
  const bytes = png(size, render(size))
  await writeFile(fileURLToPath(new URL(name, out)), bytes)
  console.log(name, (bytes.length / 1024).toFixed(1) + ' KB')
}
