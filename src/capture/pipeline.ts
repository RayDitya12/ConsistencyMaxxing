import { CARD, type CardMode } from '../config'
import { blobToBitmap } from './canvas'
import { computeLayout } from './layout'
import { buildCaption, captionText, type CaptionInput } from './caption'
import { renderCardBlobs } from './card'
import { detectEncodeMime } from '../storage/capability'
import { paletteFromDocument } from '../theme/palette'

export interface CaptureRequest extends CaptionInput {
  blob: Blob
  mode: CardMode
  pan?: { x: number; y: number }
  zoom?: number
}

export interface CaptureResult {
  card: Blob
  thumb: Blob
  caption: string
  mode: CardMode
  width: number
  height: number
  encodeMime: 'image/webp' | 'image/jpeg'
}

export async function renderCapture(request: CaptureRequest): Promise<CaptureResult> {
  const bitmap = await blobToBitmap(request.blob)
  const encodeMime = await detectEncodeMime()
  const layout = computeLayout(request.mode)
  const caption = buildCaption(request)
  try {
    const { card, thumb } = await renderCardBlobs(
      bitmap,
      (ctx, rect) => ctx.drawImage(bitmap as unknown as CanvasImageSource, rect.x, rect.y, rect.w, rect.h),
      caption,
      layout,
      { palette: paletteFromDocument(typeof document !== 'undefined' ? document : undefined), pan: request.pan, zoom: request.zoom },
      encodeMime,
      CARD.quality,
      CARD.thumbEdge,
    )
    return { card, thumb, caption: captionText(caption), mode: request.mode, width: layout.card.w, height: layout.card.h, encodeMime }
  } finally {
    bitmap.close()
  }
}
