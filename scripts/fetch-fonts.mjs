/**
 * Mengunduh subset Latin Public Sans 400 dan 600 yang dipakai UI + kartu foto.
 *
 * Dua hal yang bikin script ini ada:
 * 1. Menanyakan dua weight dalam SATU permintaan css2 membuat Google mengembalikan URL kit yang
 *    sama untuk keduanya, jadi file 600 pernah terpasang sebagai salinan 400 dan seluruh teks
 *    semi-bold dirender regular tanpa suara. Satu permintaan per weight adalah wajib, dan hasilnya
 *    dibandingkan di bawah.
 * 2. Subsetnya harus Latin penuh, bukan seadanya: nama plan dan catatan adalah tulisan bebas user,
 *    glif yang hilang jatuh ke font sistem dan tercetak permanen di kartu.
 *
 * Pemakaian: npm run fonts
 */
import { writeFile } from 'node:fs/promises'

const WEIGHTS = [400, 600]
const out = new URL('../public/fonts/', import.meta.url)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function latinUrlFor(weight) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=Public+Sans:wght@${weight}`, { headers: { 'user-agent': UA } })
  ).text()
  const latin = css
    .split('@font-face')
    .slice(1)
    .find((block) => block.includes(`font-weight: ${weight}`) && block.includes('unicode-range: U+0000-00FF'))
  if (!latin) throw new Error(`Bobot ${weight}: blok subset latin tidak ada di respons Google Fonts.`)
  const url = latin.match(/url\((https:[^)]+)\)/)?.[1]
  if (!url) throw new Error(`Bobot ${weight}: tidak ada URL woff2 di blok latin.`)
  return url
}

const urls = new Map()
for (const weight of WEIGHTS) urls.set(weight, await latinUrlFor(weight))
if (new Set(urls.values()).size !== WEIGHTS.length) {
  throw new Error('Google Fonts mengembalikan URL yang sama untuk dua weight — hasilkan satu berkas untuk dua bobot.')
}

for (const [weight, url] of urls) {
  const bytes = new Uint8Array(await (await fetch(url, { headers: { 'user-agent': UA } })).arrayBuffer())
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== 'wOF2') throw new Error(`Bobot ${weight}: bukan woff2.`)
  const name = `public-sans-${weight}.woff2`
  await writeFile(new URL(name, out), bytes)
  console.log(`${name}: ${(bytes.byteLength / 1024).toFixed(1)} KB`)
}
