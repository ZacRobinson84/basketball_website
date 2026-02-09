import { useState, useEffect } from 'react'
import ColorThief from 'colorthief'

export function useDominantColor(imageUrl) {
  const [color, setColor] = useState(null)

  useEffect(() => {
    if (!imageUrl) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`

    img.onload = () => {
      try {
        const ct = new ColorThief()
        setColor(ct.getColor(img))
      } catch {
        // CORS failure or image too small — keep null
      }
    }

    img.onerror = () => {
      // failed to load — keep null
    }
  }, [imageUrl])

  return color
}

export function colorToGradient(color) {
  if (!color) return undefined
  const [r, g, b] = color
  return `linear-gradient(to right, rgba(${r},${g},${b},0.15), rgba(${r},${g},${b},0.03))`
}
