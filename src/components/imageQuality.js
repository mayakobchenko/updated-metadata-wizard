// Quality control for pictures added to the data descriptor.
// Figures are printed about 6 inches (15 cm) wide, so effective resolution = pixel width / 6.
export const PRINT_WIDTH_IN = 6
export const MIN_WIDTH_PX = 600          // below this the picture is rejected (100 dpi at 6 in)
export const MAX_SIDE_PX = 3600          // larger pictures are scaled down (600 dpi at 6 in)
export const DPI_AMBER = 150
export const DPI_GREEN = 300

export function effectiveDpi(widthPx) { return Math.round(widthPx / PRINT_WIDTH_IN) }

// 'red' | 'amber' | 'green' plus a plain-language message
export function classifyDpi(widthPx) {
  const dpi = effectiveDpi(widthPx)
  if (dpi < DPI_AMBER) return { level: 'red', dpi, message: `Low resolution (${dpi} dpi at 6 inches wide). The picture may look blurry in print. Please use a larger export (at least ${DPI_AMBER * PRINT_WIDTH_IN} pixels wide, ideally ${DPI_GREEN * PRINT_WIDTH_IN}).` }
  if (dpi < DPI_GREEN) return { level: 'amber', dpi, message: `Acceptable resolution (${dpi} dpi at 6 inches wide). For print, ${DPI_GREEN} dpi or more (${DPI_GREEN * PRINT_WIDTH_IN} pixels wide) is better.` }
  return { level: 'green', dpi, message: `Good resolution (${dpi} dpi at 6 inches wide).` }
}

// Scale factor that brings the longest side to MAX_SIDE_PX (1 = unchanged)
export function downscaleFactor(width, height) {
  const longest = Math.max(width, height)
  return longest > MAX_SIDE_PX ? MAX_SIDE_PX / longest : 1
}

// Browser only. Reads the file, applies the EXIF rotation, paints transparency on white, scales
// down very large pictures and re-encodes. Returns { dataUrl, width, height, type, notes[], quality }.
// Throws an Error with a user-readable message when the picture is unusable.
export async function processImage(file) {
  const isPng = /png$/i.test(file.type) || /\.png$/i.test(file.name)
  let bmp
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`"${file.name}" could not be read as a picture. Is the file damaged?`)
  }
  const { width: w0, height: h0 } = bmp
  if (w0 < MIN_WIDTH_PX) {
    bmp.close?.()
    throw new Error(`"${file.name}" is only ${w0} pixels wide, which is too small (at least ${MIN_WIDTH_PX} pixels are needed). Please export a larger version.`)
  }
  const notes = []
  const f = downscaleFactor(w0, h0)
  const width = Math.round(w0 * f), height = Math.round(h0 * f)
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height)   // transparent areas become white
  ctx.drawImage(bmp, 0, 0, width, height)
  bmp.close?.()
  if (f < 1) notes.push(`Scaled down from ${w0}×${h0} to ${width}×${height} pixels to keep the file size reasonable.`)
  const type = isPng ? 'png' : 'jpg'
  const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92)
  return { dataUrl, width, height, type, notes, quality: classifyDpi(width) }
}
