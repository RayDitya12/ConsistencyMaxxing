import { CARD } from '../config'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface CardLayout {
  card: { w: number; h: number }
  /** Foto mengisi kartu sepenuhnya; tidak ada area kanvas yang tersisa untuk pita. */
  photo: Rect
  /** Daerah gelap yang menimpa tepi bawah foto tempat caption duduk. */
  scrim: Rect
  thumbEdge: number
}

export function computeLayout(): CardLayout {
  const edge = CARD.edge
  return {
    card: { w: edge, h: edge },
    photo: { x: 0, y: 0, w: edge, h: edge },
    scrim: { x: 0, y: edge - CARD.scrimHeight, w: edge, h: CARD.scrimHeight },
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
