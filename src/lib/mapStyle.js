// Minimal satellite-only base style. All vector overlays added in Map.jsx on load.
export const mapStyle = {
  version: 8,
  name: 'WildCamp Satellite',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Tiles &copy; Esri',
    },
  },
  layers: [
    {
      id: 'satellite-base',
      type: 'raster',
      source: 'satellite',
      paint: { 'raster-opacity': 1 },
    },
  ],
}

// Road + place layers to add on top of satellite after map loads
export function addRoadLayers(map) {
  map.addSource('openfree', {
    type: 'vector',
    url: 'https://tiles.openfreemap.org/planet',
  })

  // Road casings
  map.addLayer({
    id: 'road-casing',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary'],
    paint: {
      'line-color': 'rgba(0,0,0,0.5)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 10, 4, 14, 8],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // Motorways/trunks (yellow)
  map.addLayer({
    id: 'road-motorway',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'motorway', 'trunk'],
    paint: {
      'line-color': '#f7c948',
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 10, 2.5, 14, 5],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // Primary/secondary (white)
  map.addLayer({
    id: 'road-primary',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'primary', 'secondary'],
    paint: {
      'line-color': '#ffffff',
      'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 10, 1.8, 14, 4],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // Tertiary
  map.addLayer({
    id: 'road-tertiary',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['==', 'class', 'tertiary'],
    paint: {
      'line-color': 'rgba(255,255,255,0.7)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 12, 1.2, 14, 3],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // Minor roads / tracks
  map.addLayer({
    id: 'road-minor',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'minor', 'service', 'track', 'path'],
    minzoom: 11,
    paint: {
      'line-color': 'rgba(255,255,255,0.45)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.3, 14, 1.5],
      'line-dasharray': [2, 1],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // Road labels
  map.addLayer({
    id: 'road-labels',
    type: 'symbol',
    source: 'openfree',
    'source-layer': 'transportation_name',
    minzoom: 10,
    layout: {
      'symbol-placement': 'line',
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 13],
      'text-max-angle': 30,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.7)',
      'text-halo-width': 1.5,
    },
  })

  // City/town labels
  map.addLayer({
    id: 'place-city',
    type: 'symbol',
    source: 'openfree',
    'source-layer': 'place',
    filter: ['in', 'class', 'city', 'town'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 8, 16],
      'text-max-width': 8,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.8)',
      'text-halo-width': 2,
    },
  })

  // Village/suburb labels
  map.addLayer({
    id: 'place-village',
    type: 'symbol',
    source: 'openfree',
    'source-layer': 'place',
    filter: ['in', 'class', 'village', 'suburb', 'hamlet'],
    minzoom: 9,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 14, 14],
      'text-max-width': 7,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.7)',
      'text-halo-width': 1.5,
    },
  })
}
