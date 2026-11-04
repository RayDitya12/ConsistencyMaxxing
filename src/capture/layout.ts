import { CARD, cardSize, type CardMode } from '../config'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface CardLayout {
  mode: CardMode
  card: { w: number; h: number }
  /** jendela foto selalu 1:1 dan identik di kedua mode, jadi crop tidak berubah saat HP diputar */
  photo: Rect
  band: Rect
  thumbEdge: number
}

export function computeLayout(mode: CardMode): CardLayout {
  const card = cardSize(mode)
  const edge = CARD.photoWindow
  if (mode === 'portrait') {
    return {
      mode,
      card,
      photo: { x: 0, y: 0, w: edge, h: edge },
      band: { x: 0, y: edge, w: edge, h: card.h - edge },
      thumbEdge: CARD.thumbEdge,
    }
  }
  return {
    mode,
    card,
    photo: { x: card.w - edge, y: 0, w: edge, h: edge },
    band: { x: 0, y: 0, w: card.w - edge, h: edge },
    thumbEdge: CARD.thumbEdge,
  }
}

/** Posisi cover-crop agar bagian tengah subjek tidak terpotong; pan dinormalisasi -1..1. */
export function coverRect(
  sourceW: number,
  sourceH: number,
  window: Rect,
  pan: { x: number; y: number } = { x: 0, y: 0 },
  zoom = 1,
): Rect {
  const scale = Math.max(window.w / sourceW, window.h / sourceH) * zoom
  const drawW = sourceW * scale
  const drawH = sourceH * scale
  const roomX = Math.max(0, drawW - window.w)
  const roomY = Math.max(0, drawH - window.h)
  return {
    x: window.x - roomX / 2 + (roomX / 2) * pan.x,
    y: window.y - roomY / 2 + (roomY / 2) * pan.y,
    w: drawW,
    h: drawH,
  }
}
