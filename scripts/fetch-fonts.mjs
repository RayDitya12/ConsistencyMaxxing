/**
 * Mengunduh subset Latin yang dipakai UI + kartu foto.
 *
 * Design 2 memakai Hanken Grotesk variable satu berkas (bobot 400..800). Tiga hal yang bikin
 * script ini ada:
 * 1. Menanyakan beberapa weight dalam SATU permintaan css2 bisa membuat Google mengembalikan URL
 *    kit yang sama, jadi file 600 pernah terpasang sebagai salinan 400 dan seluruh teks semi-bold
 *    dirender regular tanpa suara. URL yang dipakai dibandingkan di bawah.
 * 2. Subsetnya harus Latin penuh, bukan seadanya: nama plan dan catatan adalah tulisan bebas user,
 *    glif yang hilang jatuh ke font sistem dan tercetak permanen di kartu.
 * 3. Font variable hanya berguna kalau rentang bobotnya ikut dideklarasikan di @font-face, jadi
 *    rentang itu dibaca dari respons Google dan ditularkan ke pemanggil.
 *
 * Pemakaian: npm run fonts
 */
import { writeFile } from 'node:fs/promises'

const out = new URL('../public/fonts/', import.meta.url)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

/** 'Hanken Grotesk' 400..800 dipakai UI dan kartu; rentang bobot diambil dari respons, bukan ditebak. */
const VARIABLE = { family: 'Hanken Grotesk', range: '400..800', file: 'hanken-grotesk-var.woff2' }

async function latinBlock(family, range) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${range}`, {
      headers: { 'user-agent': UA },
    })
  ).text()
  const blocks = css.split('@font-face').slice(1)
  const latin = blocks.find((block) => block.includes('unicode-range: U+0000-00FF'))
  if (!latin) throw new Error(`${family}: blok subset latin tidak ada di respons Google Fonts.`)
  const url = latin.match(/url\((https:[^)]+)\)/)?.[1]
  const weight = latin.match(/font-weight: ([0-9 ]+)/)?.[1]?.trim()
  if (!url) throw new Error(`${family}: tidak ada URL woff2 di blok latin.`)
  return { url, weight }
}

const { url, weight } = await latinBlock(VARIABLE.family, VARIABLE.range)
const bytes = new Uint8Array(await (await fetch(url, { headers: { 'user-agent': UA } })).arrayBuffer())
if (new TextDecoder().decode(bytes.subarray(0, 4)) !== 'wOF2') throw new Error(`${VARIABLE.family}: bukan woff2.`)
if (!weight) throw new Error(`${VARIABLE.family}: rentang bobot tidak terbaca dari css.`)

await writeFile(new URL(VARIABLE.file, out), bytes)
console.log(`${VARIABLE.file}: ${(bytes.byteLength / 1024).toFixed(1)} KB, font-weight: ${weight}`)
