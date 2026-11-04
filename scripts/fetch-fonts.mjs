const weights = [400, 600]
const out = new URL('../public/fonts/', import.meta.url)

async function main() {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Public+Sans:wght@${weights.join(';')}&display=swap`
  const css = await (
    await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
    })
  ).text()

  const blocks = css.split('@font-face').slice(1)
  for (const weight of weights) {
    const latin = blocks.find((b) => b.includes(`font-weight: ${weight}`) && b.includes('unicode-range: U+0000-00FF'))
    if (!latin) throw new Error('blok subset latin tidak ditemukan untuk ' + weight)
    const url = latin.match(/url\((https:[^)]+\.woff2)\)/)?.[1]
    if (!url) throw new Error('url woff2 tidak ditemukan untuk ' + weight)
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
    const name = `public-sans-${weight}.woff2`
    await (await import('node:fs/promises')).writeFile(new URL(name, out), bytes)
    console.log(name, (bytes.byteLength / 1024).toFixed(1) + ' KB')
  }
}

main()
