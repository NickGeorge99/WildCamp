// Fetch free campsites from OSM, RIDB, USFS, NPS
// Accumulates results across pans/zooms — never clears data

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const RIDB_URL = 'https://ridb.recreation.gov/api/v1/campsites'
const RIDB_KEY = import.meta.env.VITE_RIDB_API_KEY
const USFS_URL = 'https://apps.fs.usda.gov/ArcX/rest/services/EDW/EDW_RecreationOpportunities_01/MapServer/0/query'
const NPS_URL = 'https://developer.nps.gov/api/v1/campgrounds'
const NPS_KEY = import.meta.env.VITE_NPS_API_KEY

// Master accumulator — keyed by id, never cleared
const allSites = new Map()

// Track which grid cells we've already fetched per source
const fetchedCells = {
  osm: new Set(),
  ridb: new Set(),
  usfs: new Set(),
}

function cellKey(bounds) {
  const r = (v) => Math.round(v * 10) / 10
  return `${r(bounds.south)},${r(bounds.west)},${r(bounds.north)},${r(bounds.east)}`
}

function centerKey(center) {
  return `${Math.round(center.lat * 10) / 10},${Math.round(center.lng * 10) / 10}`
}

// Try multiple Overpass endpoints with fallback
async function overpassFetch(query) {
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) continue
      const text = await res.text()
      if (!text.startsWith('{')) continue // HTML error page
      return JSON.parse(text)
    } catch {
      continue
    }
  }
  return null
}

async function fetchOSM(bounds) {
  const key = cellKey(bounds)
  if (fetchedCells.osm.has(key)) return
  fetchedCells.osm.add(key)

  const query = `[out:json][timeout:25];
(
  node["tourism"="camp_site"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out body;`

  const data = await overpassFetch(query)
  if (!data) {
    // Allow retry next time
    fetchedCells.osm.delete(key)
    console.warn('[campData] All Overpass servers failed')
    return
  }

  for (const el of data.elements || []) {
    const id = 'osm-' + el.id
    if (!allSites.has(id)) {
      allSites.set(id, {
        id,
        source: 'osm',
        name: el.tags?.name || 'Unnamed Spot',
        lat: el.lat,
        lng: el.lon,
        notes: el.tags?.description || el.tags?.note || '',
        category: el.tags?.backcountry === 'yes' ? 'Backcountry' :
                  el.tags?.fee === 'no' ? 'Free Campsite' : 'Campsite',
      })
    }
  }
}

async function fetchRIDB(center) {
  if (!RIDB_KEY) return

  const key = centerKey(center)
  if (fetchedCells.ridb.has(key)) return
  fetchedCells.ridb.add(key)

  try {
    const params = new URLSearchParams({
      latitude: center.lat,
      longitude: center.lng,
      radius: 50,
      limit: 200,
    })

    const res = await fetch(`${RIDB_URL}?${params}`, {
      headers: { apikey: RIDB_KEY },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) { fetchedCells.ridb.delete(key); return }
    const data = await res.json()

    for (const c of data.RECDATA || []) {
      if (!c.CampsiteLatitude || !c.CampsiteLongitude) continue
      const id = 'ridb-' + c.CampsiteID
      if (!allSites.has(id)) {
        allSites.set(id, {
          id,
          source: 'ridb',
          name: c.CampsiteName || 'Unnamed Site',
          lat: c.CampsiteLatitude,
          lng: c.CampsiteLongitude,
          notes: '',
          category: c.CampsiteType || 'Federal Campsite',
        })
      }
    }
  } catch (e) {
    fetchedCells.ridb.delete(key)
    throw e
  }
}

async function fetchUSFS(bounds) {
  const key = cellKey(bounds)
  if (fetchedCells.usfs.has(key)) return
  fetchedCells.usfs.add(key)

  try {
    const params = new URLSearchParams({
      geometry: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      outSR: '4326',
      outFields: 'RECAREANAME,MARKERTYPE,OBJECTID',
      where: "MARKERTYPE='Campground Camping' OR MARKERTYPE='Dispersed Camping'",
      f: 'json',
      returnGeometry: 'true',
      resultRecordCount: '500',
    })

    const res = await fetch(`${USFS_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) { fetchedCells.usfs.delete(key); return }
    const data = await res.json()

    for (const f of data.features || []) {
      if (!f.geometry) continue
      const id = 'usfs-' + (f.attributes.OBJECTID || `${f.geometry.x},${f.geometry.y}`)
      if (!allSites.has(id)) {
        allSites.set(id, {
          id,
          source: 'usfs',
          name: f.attributes.RECAREANAME || 'Unnamed USFS Site',
          lat: f.geometry.y,
          lng: f.geometry.x,
          notes: '',
          category: f.attributes.MARKERTYPE || 'Campground',
        })
      }
    }
  } catch (e) {
    fetchedCells.usfs.delete(key)
    throw e
  }
}

// NPS has ~670 campgrounds total — fetch all once and cache
let npsFetched = false

async function fetchAllNPS() {
  if (!NPS_KEY || npsFetched) return
  npsFetched = true

  try {
    let start = 0
    const limit = 50
    while (true) {
      const params = new URLSearchParams({
        limit: String(limit),
        start: String(start),
        api_key: NPS_KEY,
      })

      const res = await fetch(`${NPS_URL}?${params}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) { npsFetched = false; return }
      const data = await res.json()
      const items = data.data || []

      for (const c of items) {
        const lat = parseFloat(c.latitude)
        const lng = parseFloat(c.longitude)
        if (!lat || !lng) continue
        const id = 'nps-' + c.id
        if (!allSites.has(id)) {
          allSites.set(id, {
            id,
            source: 'nps',
            name: c.name || 'Unnamed NPS Campground',
            lat,
            lng,
            notes: c.description ? c.description.replace(/<[^>]*>/g, '').slice(0, 200) : '',
            category: 'National Park Campground',
          })
        }
      }

      if (items.length < limit) break
      start += limit
    }
  } catch (e) {
    npsFetched = false
    throw e
  }
}

let debounceTimer = null

export function fetchCampsites(map, callback) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const zoom = map.getZoom()

    // Always return accumulated data, even at low zoom
    if (zoom < 8) {
      callback(Array.from(allSites.values()))
      return
    }

    const mapBounds = map.getBounds()
    const bounds = {
      south: mapBounds.getSouth(),
      west: mapBounds.getWest(),
      north: mapBounds.getNorth(),
      east: mapBounds.getEast(),
    }
    const center = {
      lat: map.getCenter().lat,
      lng: map.getCenter().lng,
    }

    await Promise.all([
      fetchOSM(bounds).catch((e) => { console.error('OSM fetch failed:', e) }),
      fetchRIDB(center).catch((e) => { console.error('RIDB fetch failed:', e) }),
      fetchUSFS(bounds).catch((e) => { console.error('USFS fetch failed:', e) }),
      fetchAllNPS().catch((e) => { console.error('NPS fetch failed:', e) }),
    ])

    const results = Array.from(allSites.values())
    console.log(`[campData] ${results.length} total sites (osm cells: ${fetchedCells.osm.size}, ridb: ${fetchedCells.ridb.size}, usfs: ${fetchedCells.usfs.size}, nps: ${npsFetched})`)
    callback(results)
  }, 500)
}
