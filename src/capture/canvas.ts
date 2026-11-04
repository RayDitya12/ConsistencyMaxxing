type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas

export interface CanvasFactory {
  canvas: AnyCanvas
  ctx: Ctx2D
}

export function makeCanvas(w: number, h: number): CanvasFactory {
  let canvas: AnyCanvas
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(w, h)
  } else {
    const el = document.createElement('canvas')
    el.width = w
    el.height = h
    canvas = el
  }
  const ctx = (canvas as HTMLCanvasElement).getContext('2d', { alpha: false }) as Ctx2D | null
  if (!ctx) throw new Error('Canvas 2d tidak tersedia')
  return { canvas, ctx }
}

export async function encodeCanvas(canvas: AnyCanvas, mime: string, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type: mime, quality })
  return new Promise((resolve, reject) => {
    ;(canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob menghasilkan null'))),
      mime,
      quality,
    )
  })
}

export async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

/** Skala cover: sisi terpendek sumber mengisi jendela, sisinya dipotong. */
export function coverScale(sourceW: number, sourceH: number, windowEdge: number): number {
  return Math.max(windowEdge / sourceW, windowEdge / sourceH)
}
