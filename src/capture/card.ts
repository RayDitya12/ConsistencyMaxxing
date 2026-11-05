import { coverRect, type CardLayout } from './layout'
import type { Caption } from './caption'
import { wrapLines } from './caption'
import { font } from './fonts'
import { makeCanvas, encodeCanvas, type CanvasFactory } from './canvas'
import type { Palette } from '../theme/palette'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const PAD = 48
const GAP = 14

interface TypeSpec {
  headline: string
  slot: string
  brand: string
}

const TYPE: TypeSpec = { headline: '600 84px', slot: '400 36px', brand: '400 26px' }
const LINE_H = { headline: 96, slot: 48, brand: 34 }

/** Caption dicetak di atas foto, jadi warnanya tidak ikut tema: graysien selalu gelap dan teks
 * selalu terang, di terang maupun gelap. Hanya aksen kotak minggu yang mengambil warna tema. */
const ON_PHOTO = { ink: '#ffffff', ink2: 'rgba(255,255,255,0.8)' }

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

/** Teks caption harus habis di dalam graysien. Field baru dinyalakan lewat caption.ts dan test
 * geometri menahan tumpukan maksimum, jadi yang gagal adalah build, bukan kartu user. */
export function captionStack(caption: Caption, slotLines: number): number {
  const heights: number[] = []
  if (slotLines) heights.push(slotLines * LINE_H.slot)
  if (caption.headline) heights.push(LINE_H.headline)
  if (caption.brand) heights.push(LINE_H.brand)
  return PAD + heights.reduce((sum, h) => sum + h, 0) + Math.max(0, heights.length - 1) * GAP
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

  ctx.font = font(TYPE.slot)
  const slotLines = caption.slot ? wrapLines(ctx, caption.slot, layout.card.w - PAD * 2, 2) : []
  const stack = captionStack(caption, slotLines.length)
  if (stack > layout.scrim.h) throw new Error(`Caption ${stack}px tidak muat di graysien ${layout.scrim.h}px.`)
  drawCaption(ctx, caption, layout, options.palette, slotLines)
  return { canvas, ctx, width: layout.card.w, height: layout.card.h }
}

/** Semua baris teks ditumpuk dari dasar graysien ke atas: nama plan kecil, tanggal besar, merek
 * paling bawah. `wrapLines` dievaluate di luar supaya tingginya bisa diperiksa lebih dulu. */
function drawCaption(
  ctx: Ctx,
  caption: Caption,
  layout: CardLayout,
  p: Palette,
  slotLines: string[],
): void {
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 16

  let y = layout.card.h - captionStack(caption, slotLines.length)
  const headlineTop = y + (slotLines.length ? slotLines.length * LINE_H.slot + GAP : 0)

  if (slotLines.length) {
    ctx.font = font(TYPE.slot)
    ctx.fillStyle = ON_PHOTO.ink2
    for (const line of slotLines) {
      ctx.fillText(line, PAD, y)
      y += LINE_H.slot
    }
    y += GAP
  }

  if (caption.headline) {
    ctx.font = font(TYPE.headline)
    ctx.fillStyle = ON_PHOTO.ink
    ctx.fillText(caption.headline, PAD, y)
    y += LINE_H.headline + GAP
  }

  if (caption.brand) {
    ctx.font = font(TYPE.brand)
    ctx.fillStyle = ON_PHOTO.ink2
    ctx.fillText(caption.brand, PAD, y)
  }

  ctx.shadowBlur = 0
  if (caption.week) drawWeekBox(ctx, caption.week, layout.card.w - PAD, headlineTop, p)
}

/** Kotak minggu diratakan ke tepi kanan dari lebar teksnya sendiri, jadi angka lebar apa pun tetap
 * di dalam kartu. */
function drawWeekBox(ctx: Ctx, text: string, right: number, y: number, p: Palette) {
  ctx.font = font('600 44px')
  const w = Math.max(120, ctx.measureText(text).width + 44)
  const x = right - w
  ctx.fillStyle = p.accent
  ctx.fillRect(x, y, w, 64)
  ctx.fillStyle = p.accentInk
  ctx.textBaseline = 'top'
  ctx.fillText(text, x + 22, y + 10)
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
