import { imageUrl } from './LandingData.js'

// Match image resolution to its painted area, including cover cropping and hover zoom.
const images = {
  '/images/hero/audi-desert.jpg': { width: 5168, height: 3448, widths: [1280, 1920, 2560, 3840], mobileWidths: [800, 1200, 1600, 2400] },
  '/images/hero/suv-rain-detail.jpg': { width: 4130, height: 2322, widths: [1280, 1920, 2560, 3840], mobileWidths: [800, 1200, 1600, 2322] },
  '/images/hero/audi-city.jpg': { width: 5975, height: 3361, widths: [1280, 1920, 2560, 3840], mobileWidths: [800, 1200, 1600, 2400] },
  '/images/about/bentley-detail.jpg': { width: 3103, height: 3879, widths: [480, 800, 1200, 1600, 2000] },
  '/images/about/suv-interior.jpg': { width: 7952, height: 5304, widths: [480, 800, 1200, 1600, 2000] },
  '/images/services/airport-transfer.jpg': { width: 4284, height: 5712, widths: [480, 800, 1200, 1600, 2000] },
  '/images/services/rental-key-handover.jpg': { width: 4000, height: 6000, widths: [480, 800, 1200, 1600, 2000] },
}

const webpSet = (id, group, widths) => widths.map((width) => `${id.replace('.jpg', `-${group}-${width}.webp`)} ${width}w`).join(', ')
const aboutSizes = '(max-width: 640px) 240px, (max-width: 960px) 460px, 360px'
const serviceSizes = (ratio) => {
  const desktop = Math.ceil(365 * ratio * 1.07)
  const mobile = Math.ceil(350 * ratio * 1.07)
  return `(max-width: 640px) max(${mobile}px, 93vw), (max-width: 960px) max(${desktop}px, 50vw), ${Math.max(460, desktop)}px`
}

export function landingImageSources(id, variant) {
  if (!variant) return null
  const image = images[id]
  if (variant === 'hero' && image?.mobileWidths) {
    const ratio = image.width / image.height
    return { width: image.width, height: image.height, sources: [
      { media: '(max-width: 640px)', type: 'image/webp', srcSet: webpSet(id, 'mobile', image.mobileWidths), sizes: 'max(830px, 112svh)' },
      { type: 'image/webp', srcSet: webpSet(id, 'desktop', image.widths), sizes: `max(112vw, ${Math.ceil(760 * ratio * 1.12)}px, ${(112 * ratio).toFixed(2)}svh)` },
    ] }
  }
  if (image && (variant === 'about' || variant === 'service')) {
    return { width: image.width, height: image.height, sources: [
      { type: 'image/webp', srcSet: webpSet(id, 'cards', image.widths), sizes: variant === 'about' ? aboutSizes : serviceSizes(image.width / image.height) },
    ] }
  }
  // Keep the same external photographs and quality; let their image service size each response.
  if (variant === 'service' && !id.startsWith('/')) {
    return { sources: [{ srcSet: [480, 800, 1200, 1600, 2000].map((width) => `${imageUrl(id, width)} ${width}w`).join(', '), sizes: serviceSizes(1.6) }] }
  }
  return null
}
