import { coverRect, type CardLayout } from './layout'
import type { Caption } from './caption'
import { wrapLines } from './caption'
import { font } from './fonts'
import { makeCanvas, encodeCanvas, type CanvasFactory } from './canvas'
import type { Palette } from '../theme/palette'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const PAD = 48
const RULE = 2

interface TypeSpec {
  headline: string
  slot: string
  brand: string
}

const PORTRAIT_TYPE: TypeSpec = { headline: '600 92px', slot: '400 40px', brand: '400 28px' }
const LANDSCAPE_TYPE: TypeSpec = { headline: '600 46px', slot: '400 30px', brand: '400 22px' }

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

export function drawCard(
  source: { width: number; height: number },
  draw: (ctx: Ctx, rect: { x: number; y: number; w: number; h: number }) => void,
  caption: Caption,
  layout: CardLayout,
  options: DrawOptions,
): RenderedCard {
  const { canvas, ctx } = makeCanvas(layout.card.w, layout.card.h)
  const p = options.palette
  const photo = layout.photo
  const band = layout.band

  ctx.fillStyle = p.surface
  ctx.fillRect(0, 0, layout.card.w, layout.card.h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(photo.x, photo.y, photo.w, photo.h)
  ctx.clip()
  draw(
    ctx,
    coverRect(source.width, source.height, photo, options.pan ?? { x: 0, y: 0 }, options.zoom ?? 1),
  )
  ctx.restore()

  ctx.fillStyle = p.line
  if (layout.mode === 'portrait') ctx.fillRect(band.x, band.y, band.w, RULE)
  else ctx.fillRect(photo.x - RULE, 0, RULE, layout.card.h)

  drawCaption(ctx, caption, layout, options.palette, layout.mode === 'portrait' ? PORTRAIT_TYPE : LANDSCAPE_TYPE)
  return { canvas, ctx, width: layout.card.w, height: layout.card.h }
}

function drawCaption(ctx: Ctx, caption: Caption, layout: CardLayout, p: Palette, type: TypeSpec) {
  const band = layout.band
  const innerWidth = band.w - PAD * 2
  ctx.textBaseline = 'top'

  if (layout.mode === 'portrait') {
    let y = band.y + 40
    ctx.font = font(type.headline)
    ctx.fillStyle = p.ink
    ctx.fillText(caption.headline, band.x + PAD, y)
    y += 108
    if (caption.slot) {
      ctx.font = font(type.slot)
      ctx.fillStyle = p.ink2
      const [line] = wrapLines(ctx, caption.slot, innerWidth - (caption.week ? 160 : 0), 1)
      ctx.fillText(line ?? '', band.x + PAD, y)
    }
    if (caption.brand) {
      ctx.font = font(type.brand)
      ctx.fillStyle = p.ink2
      ctx.textAlign = 'right'
      ctx.fillText(caption.brand, band.x + band.w - PAD, band.y + band.h - 48)
      ctx.textAlign = 'left'
    }
    if (caption.week) drawWeekBox(ctx, caption.week, band.x + band.w - PAD - 150, band.y + 44, p)
    return
  }

  let y = 56
  ctx.font = font(type.headline)
  ctx.fillStyle = p.ink
  for (const line of wrapLines(ctx, caption.headline, band.w - PAD, 2)) {
    ctx.fillText(line, band.x + PAD / 2, y)
    y += 58
  }
  if (caption.week) drawWeekBox(ctx, caption.week, band.x + PAD / 2, y + 12, p)
  if (caption.slot) {
    ctx.font = font(type.slot)
    ctx.fillStyle = p.ink2
    const lines = wrapLines(ctx, caption.slot, band.w - PAD, 3)
    let sy = layout.card.h - 60 - lines.length * 36
    for (const line of lines) {
      ctx.fillText(line, band.x + PAD / 2, sy)
      sy += 36
    }
  }
  if (caption.brand) {
    ctx.font = font(type.brand)
    ctx.fillStyle = p.ink2
    ctx.fillText(caption.brand, band.x + PAD / 2, layout.card.h - 40)
  }
}

function drawWeekBox(ctx: Ctx, text: string, x: number, y: number, p: Palette) {
  ctx.font = font('600 44px')
  const w = Math.max(120, ctx.measureText(text).width + 44)
  ctx.fillStyle = p.accent
  ctx.fillRect(x, y, w, 64)
  ctx.fillStyle = p.accentInk
  ctx.textBaseline = 'top'
  ctx.fillText(text, x + 22, y + 10)
}

export function drawThumb(card: RenderedCard, edge: number): CanvasFactory {
  const { canvas, ctx } = makeCanvas(edge, edge)
  ctx.drawImage(card.canvas as CanvasImageSource, 0, 0, edge, edge)
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
