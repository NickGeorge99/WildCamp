import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { mapStyle, addRoadLayers } from '../lib/mapStyle'
import { registerMarkerImages } from '../lib/markers'
import { fetchCampsites } from '../lib/campData'

// PAD-US public lands: USGS MapServer with manager-based coloring (512px tiles for speed)
const PAD_US_EXPORT = 'https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer/export'

const SOURCE_COLORS = { osm: '#22c55e', ridb: '#3b82f6', user: '#f97316', usfs: '#a855f7', nps: '#14b8a6' }
const SOURCE_LABELS = { osm: 'OSM Community', ridb: 'Recreation.gov', user: 'User Submitted', usfs: 'USFS Official', nps: 'National Park' }

export default function Map({
  spots,
  onMapClick,
  selectedSpot,
  onSpotClick,
  showPublicLands,
  showSpots,
  showCellCoverage,
  flyTo,
}) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const onMapClickRef = useRef(onMapClick)

  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

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

      // Register pin marker images
      try { registerMarkerImages(map) } catch (e) { console.error('Marker images failed:', e) }

      // PAD-US public lands
      try {
        const renderer = JSON.stringify({
          type: 'uniqueValue',
          field1: 'Mang_Name',
          defaultSymbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [120, 120, 120, 80] },
          uniqueValueInfos: [
            { value: 'BLM',  symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [230, 180, 40, 140], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [180, 140, 30, 160], width: 0.5 } } },
            { value: 'USFS', symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [50, 160, 60, 140], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [30, 120, 40, 160], width: 0.5 } } },
            { value: 'NPS',  symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [120, 190, 60, 140], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [90, 150, 40, 160], width: 0.5 } } },
            { value: 'FWS',  symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: [50, 160, 60, 120], outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [30, 120, 40, 140], width: 0.5 } } },
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

      // --- Click handlers ---

      // Click user spots
      map.on('click', 'spots-layer', (e) => {
        if (e.features.length > 0) {
          const props = e.features[0].properties
          showPopup(map, e.lngLat, {
            name: props.name,
            source: 'user',
            category: props.vehicle_type,
            notes: props.notes,
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
            is_public: props.is_public === true || props.is_public === 'true',
          })
          e.preventDefault()
        }
      })

      // Click external camps
      map.on('click', 'external-camps-layer', (e) => {
        if (e.features.length > 0) {
          const props = e.features[0].properties
          showPopup(map, e.lngLat, {
            name: props.name,
            source: props.source,
            category: props.category,
            notes: props.notes,
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
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

      // Click map to add waypoint (only if not clicking a feature)
      map.on('click', (e) => {
        if (e.defaultPrevented) return
        const hitLayers = ['spots-layer', 'external-camps-layer', 'external-clusters']
        const hits = map.queryRenderedFeatures(e.point, { layers: hitLayers.filter((l) => map.getLayer(l)) })
        if (hits.length > 0) return
        onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      })

      // --- Fetch external campsites on moveend ---
      function onMoveEnd() {
        fetchCampsites(map, (sites) => {
          console.log(`[Map] received ${sites.length} external sites`)
          const geojson = externalToGeoJSON(sites)
          console.log(`[Map] GeoJSON features: ${geojson.features.length}`)
          const src = map.getSource('external-camps')
          if (src) src.setData(geojson)
        })
      }
      map.on('moveend', onMoveEnd)
      // Initial fetch if zoomed in enough
      onMoveEnd()
    })

    // Popup helper
    function showPopup(m, lngLat, props) {
      if (popupRef.current) popupRef.current.remove()

      const srcColor = SOURCE_COLORS[props.source] || '#9ca3af'
      const srcLabel = SOURCE_LABELS[props.source] || props.source
      const vehicleLabel = { any: 'Any vehicle', '4wd': '4WD required', 'hike-in': 'Hike-in only' }

      let details = ''
      if (props.source === 'user') {
        const visLabel = props.is_public ? 'Public' : 'Private'
        details = `<span style="color:#9ca3af">${vehicleLabel[props.category] || props.category}</span>
          <span style="color:${props.is_public ? '#f97316' : '#9ca3af'};font-weight:600">${visLabel}</span>`
      } else {
        details = `<span style="color:#9ca3af">${props.category || ''}</span>`
      }

      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        maxWidth: '300px',
        className: 'wildcamp-popup',
      })
        .setLngLat(lngLat)
        .setHTML(
          `<div style="padding:8px">
            <strong style="font-size:14px;color:#f3f4f6">${props.name}</strong>
            <div style="margin-top:4px;display:flex;gap:8px;align-items:center;font-size:12px">
              <span style="background:${srcColor};color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600">${srcLabel}</span>
              ${details}
            </div>
            <div style="margin-top:4px;font-size:11px;color:#6b7280">${props.lat.toFixed(5)}, ${props.lng.toFixed(5)}</div>
            ${props.notes ? `<div style="margin-top:6px;font-size:13px;color:#d1d5db">${props.notes}</div>` : ''}
          </div>`
        )
        .addTo(m)
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
  }, [spots])

  // Toggle public lands
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const vis = showPublicLands ? 'visible' : 'none'
    if (map.getLayer('public-lands-fill')) map.setLayoutProperty('public-lands-fill', 'visibility', vis)
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

    const vehicleLabel = { any: 'Any vehicle', '4wd': '4WD required', 'hike-in': 'Hike-in only' }
    const visLabel = selectedSpot.is_public ? 'Public' : 'Private'
    const visColor = selectedSpot.is_public ? '#f97316' : '#9ca3af'

    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      maxWidth: '280px',
      className: 'wildcamp-popup',
    })
      .setLngLat([selectedSpot.lng, selectedSpot.lat])
      .setHTML(
        `<div style="padding:8px">
          <strong style="font-size:14px;color:#f3f4f6">${selectedSpot.name}</strong>
          <div style="margin-top:4px;display:flex;gap:8px;font-size:12px">
            <span style="background:#f97316;color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600">User Submitted</span>
            <span style="color:#9ca3af">${vehicleLabel[selectedSpot.vehicle_type] || selectedSpot.vehicle_type}</span>
            <span style="color:${visColor};font-weight:600">${visLabel}</span>
          </div>
          ${selectedSpot.notes ? `<div style="margin-top:6px;font-size:13px;color:#d1d5db">${selectedSpot.notes}</div>` : ''}
        </div>`
      )
      .addTo(mapRef.current)

    popupRef.current.on('close', () => onSpotClick(null))
  }, [selectedSpot])

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
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
