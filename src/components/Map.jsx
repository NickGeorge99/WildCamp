import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { mapStyle, addRoadLayers, addTrailConditionLayers } from '../lib/mapStyle'
import { registerMarkerImages } from '../lib/markers'
import { fetchCampsites } from '../lib/campData'
import { shareOrCopy } from '../lib/share'

// PAD-US public lands: USGS MapServer with manager-based coloring (512px tiles for speed)
const PAD_US_EXPORT = 'https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer/export'
const PAD_US_QUERY = 'https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer/0/query'

const AGENCY_COLORS = { BLM: '#e6b428', USFS: '#228b22', NPS: '#644628', FWS: '#32b4b4', DOD: '#b45050', TRIB: '#aa7846' }

const SOURCE_COLORS = { osm: '#22c55e', ridb: '#3b82f6', user: '#f97316', usfs: '#a855f7', nps: '#14b8a6' }
const SOURCE_LABELS = { osm: 'OSM Community', ridb: 'Recreation.gov', user: 'User Submitted', usfs: 'USFS Official', nps: 'National Park' }

// NIFC active wildfire endpoints
const FIRE_PERIMETERS_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query'
const FIRE_POINTS_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query'

const ICON = {
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  navigate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>',
  share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  pinSmall: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f87171" stroke="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3" fill="#1f2937"/></svg>',
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>',
  camera: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  vehicle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h1m16 0h1M6.6 17H4a2 2 0 01-2-2v-4l2.7-5.4A2 2 0 016.5 4h11a2 2 0 011.8 1.1L22 10.5V15a2 2 0 01-2 2h-2.6"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/></svg>',
  lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  globe: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
  chevronL: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chevronR: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
}

function getNavUrl(lat, lng) {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream
  return isIOS
    ? `maps://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML
    btn.innerHTML = '<span style="color:#22c55e">Copied!</span>'
    setTimeout(() => { btn.innerHTML = orig }, 1500)
  }).catch(() => {})
}

export default function Map({
  spots,
  onMapClick,
  selectedSpot,
  onSpotClick,
  showPublicLands,
  showSpots,
  showCellCoverage,
  showFires,
  show3DTerrain,
  showTrailConditions,
  flyTo,
  drawMode,
  onToggleDrawMode,
  onEditSpot,
  onAddPhoto,
  onRemovePhoto,
  onSaveAndGetId,
  onViewPhotos,
  user,
}) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const photoInputRef = useRef(null)
  const photoSpotIdRef = useRef(null)
  const pendingPhotoPropsRef = useRef(null)
  const lastExternalSitesRef = useRef([])
  const onMapClickRef = useRef(onMapClick)
  const drawModeRef = useRef(drawMode)
  const onEditSpotRef = useRef(onEditSpot)
  const onAddPhotoRef = useRef(onAddPhoto)
  const onRemovePhotoRef = useRef(onRemovePhoto)
  const onSaveAndGetIdRef = useRef(onSaveAndGetId)
  const onViewPhotosRef = useRef(onViewPhotos)
  const userRef = useRef(user)
  const spotsRef = useRef(spots)

  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { drawModeRef.current = drawMode }, [drawMode])
  useEffect(() => { onEditSpotRef.current = onEditSpot }, [onEditSpot])
  useEffect(() => { onAddPhotoRef.current = onAddPhoto }, [onAddPhoto])
  useEffect(() => { onRemovePhotoRef.current = onRemovePhoto }, [onRemovePhoto])
  useEffect(() => { onSaveAndGetIdRef.current = onSaveAndGetId }, [onSaveAndGetId])
  useEffect(() => { onViewPhotosRef.current = onViewPhotos }, [onViewPhotos])
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { spotsRef.current = spots }, [spots])

  function attachPopupHandlers(popup, props, coords) {
    const el = popup.getElement()
    const images = props.images || []

    // Carousel logic
    const carousel = el.querySelector('.wc-carousel')
    if (carousel && images.length > 0) {
      const track = carousel.querySelector('.wc-carousel-track')
      const dots = carousel.querySelectorAll('.wc-dot')
      const prevBtn = carousel.querySelector('.wc-carousel-prev')
      const nextBtn = carousel.querySelector('.wc-carousel-next')
      const removeBtn = carousel.querySelector('.wc-carousel-remove')
      let idx = 0

      function goTo(i) {
        idx = Math.max(0, Math.min(i, images.length - 1))
        track.style.transform = `translateX(-${idx * 100}%)`
        dots.forEach((d, di) => d.classList.toggle('wc-dot-active', di === idx))
      }

      if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(idx - 1) })
      if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(idx + 1) })

      // Swipe support
      let touchX = 0
      carousel.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX }, { passive: true })
      carousel.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchX
        if (dx > 50) goTo(idx - 1)
        else if (dx < -50) goTo(idx + 1)
      })

      // Click image to open fullscreen viewer
      track.querySelectorAll('.wc-carousel-img').forEach((img) => {
        img.addEventListener('click', () => {
          const i = parseInt(img.dataset.photoIndex, 10) || 0
          onViewPhotosRef.current({ images, index: i })
        })
      })

      // Remove current photo
      if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
          e.stopPropagation()
          const url = images[idx]
          if (!url || !props.id) return
          removeBtn.textContent = '...'
          await onRemovePhotoRef.current(props.id, url)
        })
      }
    }

    // Coords copy
    const coordsEl = el.querySelector('#wc-coords')
    if (coordsEl) coordsEl.addEventListener('click', () => copyToClipboard(coords, coordsEl))

    // Save to Waypoints
    const saveBtn = el.querySelector('#wc-save-spot')
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.innerHTML = 'Saving...'
        saveBtn.disabled = true
        const newId = await onSaveAndGetIdRef.current({
          name: props.name,
          notes: props.notes || '',
          vehicle_type: 'any',
          lat: props.lat,
          lng: props.lng,
        })
        saveBtn.innerHTML = '✓ Saved!'
        saveBtn.classList.add('wc-btn-saved')
        if (newId) {
          props.id = newId
          props.source = 'user'
        }
      })
    }

    // Share
    const shareEl = el.querySelector('#wc-share-spot')
    if (shareEl && props.share_token) {
      shareEl.addEventListener('click', () => {
        const url = `${window.location.origin}?spot=${props.share_token}`
        shareOrCopy(url, props.name, shareEl)
      })
    }

    // Edit
    const editEl = el.querySelector('#wc-edit-spot')
    if (editEl && props.id) {
      editEl.addEventListener('click', () => {
        const fullSpot = spotsRef.current.find((s) => s.id === props.id)
        if (fullSpot) {
          popupRef.current?.remove()
          onEditSpotRef.current(fullSpot)
        }
      })
    }

    // Add Photo
    const addPhotoEl = el.querySelector('#wc-add-photo')
    if (addPhotoEl) {
      addPhotoEl.addEventListener('click', () => {
        if (props.id) {
          photoSpotIdRef.current = props.id
          photoInputRef.current?.click()
        } else {
          pendingPhotoPropsRef.current = props
          photoInputRef.current?.click()
        }
      })
    }
  }

  function buildPopupHTML(props, { isOwner, isLoggedIn }) {
    const srcColor = SOURCE_COLORS[props.source] || '#9ca3af'
    const srcLabel = SOURCE_LABELS[props.source] || props.source
    const vehicleLabel = { any: 'Any Vehicle', '4wd': '4WD Required', 'hike-in': 'Hike-in Only' }
    const coords = `${props.lat.toFixed(5)}, ${props.lng.toFixed(5)}`
    const images = props.images || []

    // Photo carousel
    let carouselHtml = ''
    if (images.length > 0) {
      const badge = `<div class="wc-carousel-badge">${ICON.camera} ${images.length} Photo${images.length > 1 ? 's' : ''}</div>`
      const dots = images.length > 1
        ? `<div class="wc-carousel-dots">${images.map((_, i) => `<span class="wc-dot${i === 0 ? ' wc-dot-active' : ''}" data-dot="${i}"></span>`).join('')}</div>`
        : ''
      const prevBtn = images.length > 1 ? `<button class="wc-carousel-arrow wc-carousel-prev">${ICON.chevronL}</button>` : ''
      const nextBtn = images.length > 1 ? `<button class="wc-carousel-arrow wc-carousel-next">${ICON.chevronR}</button>` : ''
      carouselHtml = `<div class="wc-carousel" data-index="0">
        <div class="wc-carousel-track">${images.map((u, i) =>
          `<img src="${u}" alt="" class="wc-carousel-img" data-photo-index="${i}" />`
        ).join('')}</div>
        ${prevBtn}${nextBtn}${badge}${dots}
        ${isOwner ? `<button class="wc-carousel-remove" title="Remove photo">&times;</button>` : ''}
      </div>`
    }

    // Meta line
    let metaHtml = ''
    if (props.source === 'user') {
      const veh = vehicleLabel[props.category] || vehicleLabel[props.vehicle_type] || props.category || 'Any Vehicle'
      const visIcon = props.is_public ? ICON.globe : ICON.lock
      const visLabel = props.is_public ? 'Public' : 'Private'
      metaHtml = `<div class="wc-popup-meta">${ICON.vehicle}<span>${veh}</span><span class="wc-meta-sep">·</span>${visIcon}<span>${visLabel}</span></div>`
    } else if (props.category) {
      metaHtml = `<div class="wc-popup-meta">${ICON.vehicle}<span>${props.category}</span></div>`
    }

    // Buttons
    const saveRow = props.source !== 'user'
      ? `<button id="wc-save-spot" class="wc-btn-save">${ICON.pin}<span>Save to Waypoints</span></button>`
      : ''
    const shareBtn = props.share_token
      ? `<button id="wc-share-spot" class="wc-btn-sec">${ICON.share}<span>Share</span></button>`
      : ''
    const editBtn = isOwner
      ? `<button id="wc-edit-spot" class="wc-btn-sec">${ICON.edit}<span>Edit</span></button>`
      : ''
    const addPhotoBtn = isLoggedIn
      ? `<button id="wc-add-photo" class="wc-btn-sec">${ICON.camera}<span>Add Photo</span></button>`
      : ''

    const secondaryBtns = [editBtn, addPhotoBtn, shareBtn].filter(Boolean).join('')

    return `<div class="wc-popup">
      ${carouselHtml}
      <div class="wc-popup-body">
        <div class="wc-popup-tags"><span class="wc-tag" style="background:${srcColor}">${srcLabel}</span></div>
        <div class="wc-popup-name">${props.name}</div>
        ${metaHtml}
        ${props.notes ? `<div class="wc-popup-notes">${props.notes}</div>` : ''}
        <div id="wc-coords" class="wc-popup-coords">${ICON.pinSmall}<span>${coords}</span></div>
        <a href="${getNavUrl(props.lat, props.lng)}" target="_blank" rel="noopener" class="wc-btn-navigate">${ICON.navigate}<span>Navigate</span></a>
        ${saveRow}
        ${secondaryBtns ? `<div class="wc-popup-secondary">${secondaryBtns}</div>` : ''}
      </div>
    </div>`
  }

  async function handlePhotoInput(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const btn = popupRef.current?.getElement()?.querySelector('#wc-add-photo')
    if (btn) {
      btn.innerHTML = `<span style="font-size:12px">Uploading...</span>`
      btn.style.opacity = '0.6'
      btn.style.pointerEvents = 'none'
    }

    let spotId = photoSpotIdRef.current
    const pendingProps = pendingPhotoPropsRef.current

    // If it's an external campsite, save it first to get a spot id
    if (!spotId && pendingProps) {
      spotId = await onSaveAndGetIdRef.current({
        name: pendingProps.name,
        notes: pendingProps.notes || '',
        vehicle_type: 'any',
        lat: pendingProps.lat,
        lng: pendingProps.lng,
      })
    }

    if (spotId && onAddPhotoRef.current) {
      await onAddPhotoRef.current(spotId, files)
    }

    if (btn) {
      btn.innerHTML = `<span style="color:#22c55e;font-size:12px;font-weight:600">Added!</span>`
      setTimeout(() => {
        btn.innerHTML = `${ICON.camera}<span>Add Photo</span>`
        btn.style.opacity = ''
        btn.style.pointerEvents = ''
      }, 2000)
    }

    if (photoInputRef.current) photoInputRef.current.value = ''
    photoSpotIdRef.current = null
    pendingPhotoPropsRef.current = null
  }

  function updateExternalCamps(m) {
    const sites = lastExternalSitesRef.current
    const userSpots = spotsRef.current || []
    const filtered = sites.filter((s) =>
      !userSpots.some((u) => Math.abs(u.lat - s.lat) < 0.0005 && Math.abs(u.lng - s.lng) < 0.0005)
    )
    const src = m?.getSource('external-camps')
    if (src) src.setData(externalToGeoJSON(filtered))
  }

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-110.0, 38.5],
      zoom: 5,
      attributionControl: true,
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right'
    )

    map.on('load', () => {
      // Add road/place overlay from OpenFreeMap
      try { addRoadLayers(map) } catch (e) { console.error('Road layers failed:', e) }
      try { addTrailConditionLayers(map) } catch (e) { console.error('Trail condition layers failed:', e) }

      // Register pin marker images
      try { registerMarkerImages(map) } catch (e) { console.error('Marker images failed:', e) }

      // Terrain DEM source + hillshade
      try {
        map.addSource('dem', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15,
        })
        map.addLayer({
          id: 'hillshade',
          type: 'hillshade',
          source: 'dem',
          paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#000000' },
        })
      } catch (e) { console.error('Terrain layers failed:', e) }

      // PAD-US public lands
      try {
        const renderer = JSON.stringify({
          type: 'uniqueValue',
          field1: 'Mang_Name',
          defaultSymbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [120, 120, 120, 80] },
          uniqueValueInfos: [
            { value: 'BLM',  symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [230, 180, 40, 140], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [180, 140, 30, 160], width: 0.5 } } },
            { value: 'USFS', symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [34, 139, 34, 140], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [20, 100, 20, 160], width: 0.5 } } },
            { value: 'NPS',  symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [100, 70, 40, 140], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [80, 55, 30, 160], width: 0.5 } } },
            { value: 'FWS',  symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [50, 180, 180, 130], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [30, 140, 140, 150], width: 0.5 } } },
            { value: 'DOD',  symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [180, 80, 80, 100], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [140, 60, 60, 120], width: 0.5 } } },
            { value: 'TRIB', symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [170, 120, 70, 100], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [140, 90, 50, 120], width: 0.5 } } },
          ],
        })
        const layerDef = JSON.stringify([{ id: 0, source: { type: 'mapLayer', mapLayerId: 0 }, drawingInfo: { renderer: JSON.parse(renderer) } }])

        const padParams = new URLSearchParams({
          dpi: '96',
          transparent: 'true',
          format: 'png32',
          dynamicLayers: layerDef,
          f: 'image',
          bboxSR: '3857',
          imageSR: '3857',
          size: '512,512',
        })
        map.addSource('pad-us', {
          type: 'raster',
          tiles: [`${PAD_US_EXPORT}?${padParams}&bbox={bbox-epsg-3857}`],
          tileSize: 512,
          maxzoom: 11,
        })

        map.addLayer({
          id: 'public-lands-fill',
          type: 'raster',
          source: 'pad-us',
          paint: { 'raster-opacity': 0.6 },
        })
        // Land labels source (layer added later so it renders on top)
        map.addSource('land-labels', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
      } catch (e) { console.error('PAD-US layers failed:', e) }

      // --- FCC Cell Coverage layer (H3 hexagons) ---
      try {
        map.addSource('cell-coverage', {
          type: 'vector',
          tiles: [
            'https://vectortileservices.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/FCC_Mobile_Broadband_Data_Collection/VectorTileServer/tile/{z}/{y}/{x}.pbf',
          ],
          minzoom: 0,
          maxzoom: 12,
        })

        // 4G LTE coverage (teal, rendered first / below)
        map.addLayer({
          id: 'cell-coverage-4g',
          type: 'fill',
          source: 'cell-coverage',
          'source-layer': 'FABRIC',
          filter: ['any',
            ['==', '_symbol', 4], // 4G LTE 5/1 In-Vehicle
            ['==', '_symbol', 5], // 4G LTE 5/1 Outdoor
          ],
          paint: {
            'fill-color': '#5eead4',
            'fill-opacity': 0.3,
          },
          layout: { visibility: 'none' },
        })

        // 5G NR coverage (blue, rendered on top)
        map.addLayer({
          id: 'cell-coverage-5g',
          type: 'fill',
          source: 'cell-coverage',
          'source-layer': 'FABRIC',
          filter: ['any',
            ['==', '_symbol', 0], // 5G NR 35/3 In-Vehicle
            ['==', '_symbol', 1], // 5G NR 35/3 Outdoor
            ['==', '_symbol', 2], // 5G NR 7/1 In-Vehicle
            ['==', '_symbol', 3], // 5G NR 7/1 Outdoor
          ],
          paint: {
            'fill-color': ['match', ['get', '_symbol'],
              0, '#1e40af',
              1, '#2563eb',
              2, '#3b82f6',
              3, '#60a5fa',
              '#3b82f6',
            ],
            'fill-opacity': 0.4,
          },
          layout: { visibility: 'none' },
        })
      } catch (e) { console.error('Cell coverage layers failed:', e) }

      // --- Active Wildfires (NIFC) ---
      try {
        map.addSource('fire-perimeters', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addSource('fire-points', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })

        // Fire perimeter fills
        map.addLayer({
          id: 'fire-perimeters-fill',
          type: 'fill',
          source: 'fire-perimeters',
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.25,
          },
          layout: { visibility: 'visible' },
        })
        // Fire perimeter outlines
        map.addLayer({
          id: 'fire-perimeters-line',
          type: 'line',
          source: 'fire-perimeters',
          paint: {
            'line-color': '#dc2626',
            'line-width': 2,
          },
          layout: { visibility: 'visible' },
        })
        // Wildfire points (WF) — orange/red
        map.addLayer({
          id: 'fire-points-wf',
          type: 'circle',
          source: 'fire-points',
          filter: ['==', ['get', 'type'], 'WF'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 5, 10, 9],
            'circle-color': '#f97316',
            'circle-stroke-color': '#dc2626',
            'circle-stroke-width': 2,
            'circle-opacity': 0.9,
          },
          layout: { visibility: 'visible' },
        })
        // Prescribed burn points (RX) — yellow
        map.addLayer({
          id: 'fire-points-rx',
          type: 'circle',
          source: 'fire-points',
          filter: ['==', ['get', 'type'], 'RX'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 10, 7],
            'circle-color': '#fbbf24',
            'circle-stroke-color': '#d97706',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.85,
          },
          layout: { visibility: 'visible' },
        })
        // Fire labels
        map.addLayer({
          id: 'fire-labels',
          type: 'symbol',
          source: 'fire-points',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-optional': true,
            visibility: 'visible',
          },
          paint: {
            'text-color': ['match', ['get', 'type'], 'RX', '#fde68a', '#fca5a5'],
            'text-halo-color': 'rgba(0,0,0,0.8)',
            'text-halo-width': 1.5,
          },
        })

        // Click fire points for info
        function onFireClick(e) {
          if (e.features.length > 0) {
            const props = e.features[0].properties
            const isRx = props.type === 'RX'
            const acres = props.acres ? `${Number(props.acres).toLocaleString()} acres` : 'Size unknown'
            const contained = props.contained != null ? `${props.contained}% contained` : ''
            const badgeColor = isRx ? '#d97706' : '#dc2626'
            const badgeText = isRx ? 'Prescribed Burn' : 'Wildfire'
            const nameClass = isRx ? 'wc-fire-rx' : 'wc-fire-wf'
            if (popupRef.current) popupRef.current.remove()
            popupRef.current = new maplibregl.Popup({
              closeButton: true,
              maxWidth: '320px',
              className: 'wildcamp-popup',
            })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div class="wc-popup">
                  <div class="wc-popup-name ${nameClass}">${props.name || 'Unknown'}</div>
                  <div class="wc-popup-tags">
                    <span class="wc-tag" style="background:${badgeColor}">${badgeText}</span>
                    <span class="wc-meta">${acres}</span>
                  </div>
                  ${contained ? `<div class="wc-popup-notes">${contained}</div>` : ''}
                </div>`
              )
              .addTo(map)
            e.preventDefault()
          }
        }
        map.on('click', 'fire-points-wf', onFireClick)
        map.on('click', 'fire-points-rx', onFireClick)
        for (const id of ['fire-points-wf', 'fire-points-rx']) {
          map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
        }

        // Fetch fire data
        fetchFireData(map)
      } catch (e) { console.error('Fire layers failed:', e) }

      // --- User spots layer ---
      map.addSource('spots', {
        type: 'geojson',
        data: spotsToGeoJSON([]),
      })

      map.addLayer({
        id: 'spots-layer',
        type: 'symbol',
        source: 'spots',
        layout: {
          'icon-image': [
            'concat',
            'pin-',
            ['get', 'vehicle_type'],
            '-',
            ['case', ['get', 'is_public'], 'public', 'private'],
          ],
          'icon-size': 1,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-offset': [0, 0.3],
          'text-size': 12,
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      })

      // --- External campsites layer (OSM + RIDB) ---
      map.addSource('external-camps', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      })

      // Cluster circles
      map.addLayer({
        id: 'external-clusters',
        type: 'circle',
        source: 'external-camps',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#6b7280',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Cluster count labels
      map.addLayer({
        id: 'external-cluster-count',
        type: 'symbol',
        source: 'external-camps',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Individual external camp markers
      map.addLayer({
        id: 'external-camps-layer',
        type: 'symbol',
        source: 'external-camps',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'pin-src-', ['get', 'source']],
          'icon-size': 0.85,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-offset': [0, 0.3],
          'text-size': 11,
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      })

      // --- Land labels layer (on top of everything) ---
      if (map.getSource('land-labels')) {
        map.addLayer({
          id: 'land-labels-text',
          type: 'symbol',
          source: 'land-labels',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 13, 14, 15],
            'text-font': ['Noto Sans Bold'],
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.08,
            'text-max-width': 10,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-padding': 20,
            'symbol-sort-key': ['*', -1, ['get', 'acres']],
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': 'rgba(0,0,0,0.75)',
            'text-halo-width': 1.5,
            'text-opacity': 0.9,
          },
        })
      }

      // --- Click handlers ---

      // Click user spots
      map.on('click', 'spots-layer', (e) => {
        if (e.features.length > 0) {
          const props = e.features[0].properties
          showPopup(map, e.lngLat, {
            id: props.id,
            name: props.name,
            source: 'user',
            category: props.vehicle_type,
            notes: props.notes,
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
            is_public: props.is_public === true || props.is_public === 'true',
            share_token: props.share_token,
            user_id: props.user_id,
            images: props.images ? JSON.parse(props.images) : [],
          })
          e.preventDefault()
        }
      })

      // Click external camps
      map.on('click', 'external-camps-layer', (e) => {
        if (e.features.length > 0) {
          const props = e.features[0].properties
          const [fLng, fLat] = e.features[0].geometry.coordinates
          showPopup(map, [fLng, fLat], {
            name: props.name,
            source: props.source,
            category: props.category,
            notes: props.notes,
            lat: fLat,
            lng: fLng,
          })
          e.preventDefault()
        }
      })

      // Click clusters to zoom in
      map.on('click', 'external-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['external-clusters'] })
        const clusterId = features[0].properties.cluster_id
        map.getSource('external-camps').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (!err) {
            map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 1 })
          }
        })
        e.preventDefault()
      })

      // Cursor changes
      for (const layer of ['spots-layer', 'external-camps-layer', 'external-clusters']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      }

      // Click map — draw mode: add waypoint, otherwise: show location info
      map.on('click', (e) => {
        if (e.defaultPrevented) return
        const hitLayers = ['spots-layer', 'external-camps-layer', 'external-clusters', 'fire-points-wf', 'fire-points-rx']
        const hits = map.queryRenderedFeatures(e.point, { layers: hitLayers.filter((l) => map.getLayer(l)) })
        if (hits.length > 0) return

        if (drawModeRef.current) {
          onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        } else {
          showLocationPopup(map, e.lngLat)
        }
      })

      // --- Fetch external campsites on moveend ---
      function onMoveEnd() {
        fetchCampsites(map, (sites) => {
          lastExternalSitesRef.current = sites
          updateExternalCamps(map)
        })
      }
      map.on('moveend', onMoveEnd)
      // Initial fetch if zoomed in enough
      onMoveEnd()

      // --- Public land labels ---
      let labelTimer = null
      function fetchLandLabels() {
        clearTimeout(labelTimer)
        labelTimer = setTimeout(() => _fetchLandLabels(map), 400)
      }
      map.on('moveend', fetchLandLabels)
      fetchLandLabels()
    })

    function showPopup(m, lngLat, props) {
      if (popupRef.current) popupRef.current.remove()
      const coords = `${props.lat.toFixed(5)}, ${props.lng.toFixed(5)}`
      const isOwner = props.source === 'user' && props.user_id && userRef.current && props.user_id === userRef.current.id
      const isLoggedIn = !!userRef.current

      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        maxWidth: '340px',
        className: 'wildcamp-popup',
      })
        .setLngLat(lngLat)
        .setHTML(buildPopupHTML(props, { isOwner, isLoggedIn }))
        .addTo(m)

      attachPopupHandlers(popupRef.current, props, coords)
    }

    // Show location info popup for tapping empty map space
    async function showLocationPopup(m, lngLat) {
      if (popupRef.current) popupRef.current.remove()

      const lat = lngLat.lat
      const lng = lngLat.lng
      const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`

      // Render immediately with skeleton placeholders, then fill in async data
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        maxWidth: '340px',
        className: 'wildcamp-popup',
      })
        .setLngLat(lngLat)
        .setHTML(
          `<div class="wc-popup">
            <div class="wc-popup-body">
              <div class="wc-popup-tags">
                <span class="wc-tag wc-tag-location">Location</span>
              </div>
              <div class="wc-popup-name" id="wc-location-name">Loading&hellip;</div>
              <div class="wc-popup-meta" id="wc-location-meta" style="visibility:hidden">
                ${ICON.pin}<span id="wc-location-region">&nbsp;</span>
              </div>
              <div id="wc-coords" class="wc-popup-coords">${ICON.pinSmall}<span>${coords}</span>${ICON.copy}</div>
              <a href="${getNavUrl(lat, lng)}" target="_blank" rel="noopener" class="wc-btn-navigate">${ICON.navigate}<span>Navigate</span></a>
            </div>
          </div>`
        )
        .addTo(m)

      // Attach copy handler
      const el = popupRef.current.getElement()
      const coordsEl = el.querySelector('#wc-coords')
      if (coordsEl) coordsEl.addEventListener('click', () => copyToClipboard(coords, coordsEl))

      // Fetch reverse geocode + elevation in parallel
      const [geoData, elevData] = await Promise.allSettled([
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
          { signal: AbortSignal.timeout(6000) }
        ).then((r) => r.json()),
        fetch(
          `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`,
          { signal: AbortSignal.timeout(6000) }
        ).then((r) => r.json()),
      ])

      // --- Place name ---
      const nameEl = popupRef.current?.getElement()?.querySelector('#wc-location-name')
      if (nameEl) {
        if (geoData.status === 'fulfilled' && geoData.value?.display_name) {
          const a = geoData.value.address || {}
          // Primary name: most specific natural/place feature available
          const primary =
            a.tourism || a.natural || a.leisure || a.park || a.national_park ||
            a.amenity || a.hamlet || a.village || a.town || a.city ||
            a.county || null
          nameEl.textContent = primary
            ? primary
            : geoData.value.display_name.split(',')[0].trim()
        } else {
          nameEl.textContent = 'Unknown location'
        }
      }

      // --- Region meta line (county · state  +  elevation) ---
      const metaEl = popupRef.current?.getElement()?.querySelector('#wc-location-meta')
      const regionEl = popupRef.current?.getElement()?.querySelector('#wc-location-region')
      if (metaEl && regionEl) {
        const parts = []
        if (geoData.status === 'fulfilled') {
          const a = geoData.value?.address || {}
          if (a.county) parts.push(a.county)
          if (a.state) parts.push(a.state)
        }
        const elevVal = elevData.status === 'fulfilled' ? elevData.value?.elevation?.[0] : null
        if (elevVal != null) {
          const ft = Math.round(elevVal * 3.28084)
          parts.push(`${ft.toLocaleString()} ft`)
        }
        if (parts.length > 0) {
          regionEl.textContent = parts.join(' · ')
          metaEl.style.visibility = 'visible'
        }
      }
    }

    // Fetch active wildfire data from NIFC
    async function fetchFireData(m) {
      try {
        const params = new URLSearchParams({
          where: '1=1',
          outFields: '*',
          f: 'json',
        })

        const [pointsRes, perimsRes] = await Promise.all([
          fetch(`${FIRE_POINTS_URL}?${params}`).then((r) => r.json()).catch(() => null),
          fetch(`${FIRE_PERIMETERS_URL}?${params}`).then((r) => r.json()).catch(() => null),
        ])

        // Fire incident points
        if (pointsRes?.features) {
          const geojson = {
            type: 'FeatureCollection',
            features: pointsRes.features
              .filter((f) => f.geometry)
              .map((f) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [f.geometry.x, f.geometry.y] },
                properties: {
                  name: f.attributes.IncidentName || 'Unknown',
                  acres: f.attributes.IncidentSize || f.attributes.DiscoveryAcres,
                  contained: f.attributes.PercentContained,
                  type: f.attributes.IncidentTypeCategory || 'WF',
                },
              })),
          }
          const src = m.getSource('fire-points')
          if (src) src.setData(geojson)
          console.log(`[fires] ${geojson.features.length} incident points loaded`)
        }

        // Fire perimeters
        if (perimsRes?.features) {
          const geojson = {
            type: 'FeatureCollection',
            features: perimsRes.features
              .filter((f) => f.geometry?.rings)
              .map((f) => ({
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: f.geometry.rings.map((ring) =>
                    ring.map((c) => [c[0], c[1]])
                  ),
                },
                properties: {
                  name: f.attributes.poly_IncidentName || f.attributes.attr_IncidentName || 'Unknown',
                  acres: f.attributes.poly_GISAcres || f.attributes.attr_IncidentSize,
                },
              })),
          }
          const src = m.getSource('fire-perimeters')
          if (src) src.setData(geojson)
          console.log(`[fires] ${geojson.features.length} perimeters loaded`)
        }
      } catch (e) {
        console.error('Fire data fetch failed:', e)
      }
    }

    // Fetch public land labels from PAD-US
    async function _fetchLandLabels(m) {
      const zoom = m.getZoom()
      if (zoom < 6) {
        const src = m.getSource('land-labels')
        if (src) src.setData({ type: 'FeatureCollection', features: [] })
        return
      }

      // Minimum acreage based on zoom — show bigger areas when zoomed out
      const minAcres = zoom < 8 ? 100000 : zoom < 10 ? 10000 : zoom < 12 ? 1000 : 100

      const bounds = m.getBounds()
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`

      try {
        const params = new URLSearchParams({
          where: `GIS_Acres>${minAcres}`,
          outFields: 'Unit_Nm,Mang_Name,GIS_Acres',
          returnGeometry: 'true',
          geometryType: 'esriGeometryEnvelope',
          geometry: bbox,
          inSR: '4326',
          outSR: '4326',
          spatialRel: 'esriSpatialRelIntersects',
          f: 'json',
          resultRecordCount: '80',
          maxAllowableOffset: '0.5',
        })

        const res = await fetch(`${PAD_US_QUERY}?${params}`, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) return
        const data = await res.json()
        if (!data.features) return

        // Deduplicate by unit name, keeping largest
        const byName = new Map()
        for (const f of data.features) {
          const name = f.attributes.Unit_Nm
          if (!name || name === 'National Public Lands') continue
          const existing = byName.get(name)
          if (!existing || f.attributes.GIS_Acres > existing.attributes.GIS_Acres) {
            byName.set(name, f)
          }
        }

        const features = []
        for (const [, f] of byName) {
          const rings = f.geometry?.rings
          if (!rings || !rings[0]) continue
          const pts = rings[0]
          const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
          const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
          const agency = f.attributes.Mang_Name
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [cx, cy] },
            properties: {
              label: f.attributes.Unit_Nm,
              agency,
              acres: f.attributes.GIS_Acres,
              color: AGENCY_COLORS[agency] || '#9ca3af',
            },
          })
        }

        const src = m.getSource('land-labels')
        if (src) src.setData({ type: 'FeatureCollection', features })
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Land labels fetch failed:', e)
      }
    }

    mapRef.current = map
    return () => map.remove()
  }, [])

  // Update user spots data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('spots')
    if (source) source.setData(spotsToGeoJSON(spots))
    // Re-filter external camps to hide newly saved duplicates
    updateExternalCamps(map)
  }, [spots])

  // Toggle public lands
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const vis = showPublicLands ? 'visible' : 'none'
    if (map.getLayer('public-lands-fill')) map.setLayoutProperty('public-lands-fill', 'visibility', vis)
    if (map.getLayer('land-labels-text')) map.setLayoutProperty('land-labels-text', 'visibility', vis)
  }, [showPublicLands])

  // Toggle spots (user + external)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const vis = showSpots ? 'visible' : 'none'
    for (const id of ['spots-layer', 'external-camps-layer', 'external-clusters', 'external-cluster-count']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
  }, [showSpots])

  // Toggle cell coverage
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const vis = showCellCoverage ? 'visible' : 'none'
    for (const id of ['cell-coverage-4g', 'cell-coverage-5g']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
  }, [showCellCoverage])

  // Toggle fires
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const vis = showFires ? 'visible' : 'none'
    for (const id of ['fire-perimeters-fill', 'fire-perimeters-line', 'fire-points-wf', 'fire-points-rx', 'fire-labels']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
  }, [showFires])

  // Toggle trail conditions
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const vis = showTrailConditions ? 'visible' : 'none'
    for (const id of ['trail-paved', 'trail-gravel', 'trail-dirt', 'trail-rough']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
  }, [showTrailConditions])

  // Toggle 3D terrain
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    if (show3DTerrain) {
      if (map.getSource('dem')) map.setTerrain({ source: 'dem', exaggeration: 1.5 })
    } else {
      map.setTerrain(null)
    }
    // Hillshade always visible for depth — terrain toggle controls 3D extrusion
    if (map.getLayer('hillshade')) {
      map.setLayoutProperty('hillshade', 'visibility', 'visible')
    }
  }, [show3DTerrain])

  // Fly to
  useEffect(() => {
    if (!flyTo || !mapRef.current) return
    mapRef.current.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: flyTo.zoom || 12,
      duration: 1500,
    })
  }, [flyTo])

  // Selected spot popup (for sidebar clicks)
  useEffect(() => {
    if (!selectedSpot || !mapRef.current) return
    if (popupRef.current) popupRef.current.remove()

    const coords = `${selectedSpot.lat.toFixed(5)}, ${selectedSpot.lng.toFixed(5)}`
    const isOwner = user && selectedSpot.user_id === user.id
    const isLoggedIn = !!user
    const spotImages = selectedSpot.images || []

    const props = {
      id: selectedSpot.id,
      name: selectedSpot.name,
      source: 'user',
      category: selectedSpot.vehicle_type,
      vehicle_type: selectedSpot.vehicle_type,
      notes: selectedSpot.notes,
      lat: selectedSpot.lat,
      lng: selectedSpot.lng,
      is_public: selectedSpot.is_public,
      share_token: selectedSpot.share_token,
      user_id: selectedSpot.user_id,
      images: spotImages,
    }

    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      maxWidth: '340px',
      className: 'wildcamp-popup',
    })
      .setLngLat([selectedSpot.lng, selectedSpot.lat])
      .setHTML(buildPopupHTML(props, { isOwner, isLoggedIn }))
      .addTo(mapRef.current)

    attachPopupHandlers(popupRef.current, props, coords)
    popupRef.current.on('close', () => onSpotClick(null))
  }, [selectedSpot])

  // Update cursor for draw mode
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = drawMode ? 'crosshair' : ''
  }, [drawMode])

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoInput}
      />

      {/* Draw mode pencil button */}
      <button
        onClick={onToggleDrawMode}
        className={`absolute z-10 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all top-3 right-3 ${
          drawMode
            ? 'bg-orange-500 text-white ring-2 ring-orange-300'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
        title={drawMode ? 'Cancel drawing' : 'Add waypoint'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      </button>

      {/* Draw mode banner */}
      {drawMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
          Tap the map to place a waypoint
        </div>
      )}
    </div>
  )
}

function spotsToGeoJSON(spots) {
  return {
    type: 'FeatureCollection',
    features: (spots || []).map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        name: s.name,
        notes: s.notes || '',
        vehicle_type: s.vehicle_type,
        is_public: s.is_public,
        share_token: s.share_token || '',
        user_id: s.user_id || '',
        images: JSON.stringify(s.images || []),
        source: 'user',
      },
    })),
  }
}

function externalToGeoJSON(sites) {
  return {
    type: 'FeatureCollection',
    features: (sites || [])
      .filter((s) => s.lat && s.lng && isFinite(s.lat) && isFinite(s.lng))
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: {
          id: s.id,
          name: s.name,
          notes: s.notes || '',
          source: s.source,
          category: s.category || '',
        },
      })),
  }
}
