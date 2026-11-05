import { coverRect, type CardLayout } from './layout'
import type { Caption } from './caption'
import { font } from './fonts'
import { makeCanvas, encodeCanvas, type CanvasFactory } from './canvas'
import type { Palette } from '../theme/palette'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** Kartu design 2: satu garis stabilo, satu judul berat yang rapat, satu baris eyebrow. Semua
 * angka diukur dari tepi kartu, jadi mengubah tampilan kartu tidak pernah menyentuh kode capture. */
const MARGIN = 72
const RULE_H = 8
const GAP_RULE = 24
const GAP_META = 16
const H = { date: 88, meta: 36 }

const TYPE = { date: '800 76px', meta: '600 26px', week: '800 44px' }
const TRACK_DATE = '-0.03em'
const TRACK_META = '0.09em'

/** Kartu adalah artefak yang dibakar permanen: teks di atas foto selalu terang di atas graysien
 * gelap, apa pun tema viewer. Hanya warna merek yang ikut palet. */
const ON_PHOTO = { ink: '#ffffff', ink2: 'rgba(255,255,255,0.78)' }

export interface DrawOptions {
  pan?: { x: number; y: number }
  zoom?: number
  palette: Palette
}

export interface RenderedCard {
  canvas: CanvasFactory['canvas']
  ctx: Ctx
  width: number
  height: number
}

/** Tinggi blok caption termasuk margin bawah. Test geometri menahan nilai maksimum terhadap tinggi
 * graysien, jadi kalau field caption baru dinyalakan yang gagal adalah build, bukan kartu user. */
export function captionStack(caption: Caption, hasMeta: boolean): number {
  if (!caption.headline && !hasMeta) return 0
  let h = MARGIN
  if (caption.headline) h += RULE_H + GAP_RULE + H.date
  if (hasMeta) h += (caption.headline ? GAP_META : 0) + H.meta
  return h
}

export function drawCard(
  source: { width: number; height: number },
  draw: (ctx: Ctx, rect: { x: number; y: number; w: number; h: number }) => void,
  caption: Caption,
  layout: CardLayout,
  options: DrawOptions,
): RenderedCard {
  const { canvas, ctx } = makeCanvas(layout.card.w, layout.card.h)
  draw(
    ctx,
    coverRect(source.width, source.height, layout.photo, options.pan ?? { x: 0, y: 0 }, options.zoom ?? 1),
  )

  const scrim = ctx.createLinearGradient(0, layout.scrim.y, 0, layout.card.h)
  scrim.addColorStop(0, 'rgba(0,0,0,0)')
  scrim.addColorStop(0.55, 'rgba(0,0,0,0.5)')
  scrim.addColorStop(1, 'rgba(0,0,0,0.82)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, layout.scrim.y, layout.card.w, layout.scrim.h)

  const stack = captionStack(caption, Boolean(caption.slot || caption.brand))
  if (stack > layout.scrim.h) throw new Error(`Caption ${stack}px tidak muat di graysien ${layout.scrim.h}px.`)
  drawCaption(ctx, caption, layout, options.palette)
  return { canvas, ctx, width: layout.card.w, height: layout.card.h }
}

function drawCaption(ctx: Ctx, caption: Caption, layout: CardLayout, p: Palette): void {
  const right = layout.card.w - MARGIN
  const width = layout.card.w - MARGIN * 2
  const hasMeta = Boolean(caption.slot || caption.brand)
  let y = layout.card.h - captionStack(caption, hasMeta)
  ctx.textBaseline = 'top'

  if (caption.headline) {
    // Stabilo pendek, bukan garis selebar kartu: penanda, bukan pembatas.
    ctx.fillStyle = p.acid
    ctx.fillRect(MARGIN, y, 96, RULE_H)
    y += RULE_H + GAP_RULE
    ctx.font = font(TYPE.date)
    ctx.fillStyle = ON_PHOTO.ink
    setTracking(ctx, TRACK_DATE)
    ctx.fillText(caption.headline, MARGIN, y)
    setTracking(ctx, '0em')
    if (caption.week) drawWeekBox(ctx, caption.week, right, y, p)
    y += H.date
  }

  if (!hasMeta) return
  y += GAP_META
  ctx.font = font(TYPE.meta)
  ctx.fillStyle = ON_PHOTO.ink2
  setTracking(ctx, TRACK_META)
  const left = caption.slot ? caption.slot.toUpperCase() : ''
  if (left) ctx.fillText(left, MARGIN, y)
  // Merek hanya muncul bila muat; nama plan tulisan user tidak pernah dipotong untuknya.
  if (caption.brand) {
    const brand = caption.brand.toUpperCase()
    const fits = !left || ctx.measureText(left).width + ctx.measureText(brand).width + 48 <= width
    if (fits) ctx.fillText(brand, right - ctx.measureText(brand).width, y)
  }
  setTracking(ctx, '0em')
}

/** letterSpacing hanya ada di browser baru; kartu tanpa tracking tetap terbaca, jadi tidak perlu
 * jalur cadangan yang berbeda. */
function setTracking(ctx: Ctx, value: string) {
  const withTracking = ctx as { letterSpacing?: string }
  if ('letterSpacing' in withTracking) withTracking.letterSpacing = value
}

/** Kotak minggu: pil aksen seukuran baris tanggal, rata kanan dari lebar angkanya sendiri. */
function drawWeekBox(ctx: Ctx, text: string, right: number, y: number, p: Palette) {
  ctx.font = font(TYPE.week)
  setTracking(ctx, TRACK_DATE)
  const w = Math.max(120, ctx.measureText(text).width + 44)
  const x = right - w
  ctx.fillStyle = p.accent
  roundRect(ctx, x, y, w, H.date, 8)
  ctx.fill()
  ctx.fillStyle = p.accentInk
  ctx.fillText(text, x + 22, y + 12)
  setTracking(ctx, '0em')
}

/** roundRect baru ada di browser terbaru; kartu tanpa sudut bulat tetap kartu yang benar. */
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const shaped = ctx as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }
  ctx.beginPath()
  if (typeof shaped.roundRect === 'function') shaped.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

/** Sisi terpanjang yang dipertahankan; tinggi mengikuti rasio kartu supaya thumbnail tidak gepeng. */
export function thumbSize(cardWidth: number, cardHeight: number, edge: number) {
  const scale = edge / Math.max(cardWidth, cardHeight)
  return { w: Math.round(cardWidth * scale), h: Math.round(cardHeight * scale) }
}

export function drawThumb(card: RenderedCard, edge: number): CanvasFactory {
  const { w, h } = thumbSize(card.width, card.height, edge)
  const { canvas, ctx } = makeCanvas(w, h)
  ctx.drawImage(card.canvas as CanvasImageSource, 0, 0, w, h)
  return { canvas, ctx }
}

export async function renderCardBlobs(
  source: { width: number; height: number },
  draw: (ctx: Ctx, rect: { x: number; y: number; w: number; h: number }) => void,
  caption: Caption,
  layout: CardLayout,
  options: DrawOptions,
  mime: string,
  quality: number,
  thumbEdge: number,
): Promise<{ card: Blob; thumb: Blob }> {
  const rendered = drawCard(source, draw, caption, layout, options)
  const card = await encodeCanvas(rendered.canvas, mime, quality)
  const thumbCanvas = drawThumb(rendered, thumbEdge)
  const thumb = await encodeCanvas(thumbCanvas.canvas, mime, Math.min(quality, 0.75))
  return { card, thumb }
}
