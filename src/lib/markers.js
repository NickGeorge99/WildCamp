// Canvas-drawn teardrop pin markers, color-coded by vehicle_type and visibility

const MARKER_COLORS = {
  'any-public':     '#22c55e', // green
  'any-private':    '#15803d', // dark green
  '4wd-public':     '#f97316', // orange
  '4wd-private':    '#c2410c', // dark orange
  'hike-in-public': '#3b82f6', // blue
  'hike-in-private':'#1d4ed8', // dark blue
  // Source-based markers for external data
  'src-osm':        '#22c55e', // green for OSM community
  'src-ridb':       '#3b82f6', // blue for Recreation.gov
  'src-user':       '#f97316', // orange for user submitted
  'src-usfs':       '#a855f7', // purple for USFS official
  'src-nps':        '#14b8a6', // teal for NPS
}

const PIN_WIDTH = 28
const PIN_HEIGHT = 36

function drawPin(color) {
  const ratio = 2 // retina
  const w = PIN_WIDTH * ratio
  const h = PIN_HEIGHT * ratio
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const cx = w / 2
  const r = w * 0.38 // head radius
  const headCy = r + 2 * ratio
  const tipY = h - 2 * ratio

  // Teardrop shape
  ctx.beginPath()
  ctx.arc(cx, headCy, r, Math.PI * 1.15, Math.PI * -0.15)
  ctx.lineTo(cx, tipY)
  ctx.closePath()

  // Fill + stroke
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 2 * ratio
  ctx.stroke()

  // Inner circle
  const innerR = r * 0.42
  ctx.beginPath()
  ctx.arc(cx, headCy, innerR, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill()

  const imageData = ctx.getImageData(0, 0, w, h)
  return { data: new Uint8Array(imageData.data.buffer), width: w, height: h }
}

// Pre-generate all 6 variants and register on map
export function registerMarkerImages(map) {
  for (const [key, color] of Object.entries(MARKER_COLORS)) {
    const { data, width, height } = drawPin(color)
    if (!map.hasImage(`pin-${key}`)) {
      map.addImage(`pin-${key}`, { width, height, data }, {
        pixelRatio: 2,
        sdf: false,
      })
    }
  }
}

// Returns the image name for a given spot
export function markerImageFor(vehicleType, isPublic) {
  const vis = isPublic ? 'public' : 'private'
  const key = `${vehicleType}-${vis}`
  return `pin-${MARKER_COLORS[key] ? key : 'any-public'}`
}

export { MARKER_COLORS, PIN_WIDTH, PIN_HEIGHT }
