# Road Conditions Layer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a toggleable map layer that color-codes off-road tracks and trails by surface quality using OSM data already available in the OpenFreeMap vector tiles.

**Architecture:** OpenFreeMap's `transportation` source-layer (OpenMapTiles spec) already includes `surface` and `subclass` properties on track/path features. We add new MapLibre layers that filter on `class=track|path` and color by `surface` value. No new API calls or data fetching needed — it's all in the existing `openfree` vector tile source.

**Tech Stack:** MapLibre GL JS (existing), OpenFreeMap vector tiles (existing `openfree` source)

---

### Key Insight

The `openfree` vector tile source is already loaded in `mapStyle.js:addRoadLayers()`. OpenMapTiles spec exposes these properties on `transportation` features:
- `class`: `track`, `path`, `minor`, `service`, etc.
- `surface`: `paved`, `asphalt`, `concrete`, `gravel`, `fine_gravel`, `compacted`, `dirt`, `ground`, `grass`, `sand`, `mud`, `unpaved`
- `subclass`: `track`, `bridleway`, `footway`, `cycleway`

We'll color-code tracks/paths by surface quality in 4 tiers:
- **Green** (`#22c55e`): Paved — `paved`, `asphalt`, `concrete`
- **Yellow** (`#eab308`): Gravel — `gravel`, `fine_gravel`, `compacted`
- **Orange** (`#f97316`): Dirt — `unpaved`, `dirt`, `ground`, `earth`
- **Red** (`#ef4444`): Rough — `grass`, `sand`, `mud`, or unknown/untagged

---

### Task 1: Add Road Condition Layers to mapStyle.js

**Files:**
- Modify: `src/lib/mapStyle.js` (after the existing `road-minor` layer, ~line 104)

**Step 1: Add the `addTrailConditionLayers` export function**

Add this new exported function after `addRoadLayers()`:

```js
export function addTrailConditionLayers(map) {
  const paved = ['paved', 'asphalt', 'concrete']
  const gravel = ['gravel', 'fine_gravel', 'compacted']
  const dirt = ['unpaved', 'dirt', 'ground', 'earth']

  // Paved tracks (green)
  map.addLayer({
    id: 'trail-paved',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['all', ['in', 'class', 'track', 'path'], ['in', 'surface', ...paved]],
    minzoom: 10,
    paint: {
      'line-color': '#22c55e',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
  })

  // Gravel tracks (yellow)
  map.addLayer({
    id: 'trail-gravel',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['all', ['in', 'class', 'track', 'path'], ['in', 'surface', ...gravel]],
    minzoom: 10,
    paint: {
      'line-color': '#eab308',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
  })

  // Dirt tracks (orange)
  map.addLayer({
    id: 'trail-dirt',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: ['all', ['in', 'class', 'track', 'path'], ['in', 'surface', ...dirt]],
    minzoom: 10,
    paint: {
      'line-color': '#f97316',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
  })

  // Unknown/rough surface (red) — tracks with no surface tag or rough surfaces
  map.addLayer({
    id: 'trail-rough',
    type: 'line',
    source: 'openfree',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['in', 'class', 'track', 'path'],
      ['!', ['in', 'surface', ...paved, ...gravel, ...dirt]],
    ],
    minzoom: 10,
    paint: {
      'line-color': '#ef4444',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
    },
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
  })
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Success

**Step 3: Commit**

```bash
git add src/lib/mapStyle.js
git commit -m "feat: add trail condition layer definitions color-coded by surface type"
```

---

### Task 2: Initialize Layers in Map.jsx and Wire Up Toggle

**Files:**
- Modify: `src/components/Map.jsx`

**Step 1: Add `showTrailConditions` prop**

In the component props destructuring (~line 51), add `showTrailConditions` after `show3DTerrain`:

```js
  show3DTerrain,
  showTrailConditions,
```

**Step 2: Import `addTrailConditionLayers`**

Update the import on line 3:

```js
import { mapStyle, addRoadLayers, addTrailConditionLayers } from '../lib/mapStyle'
```

**Step 3: Call `addTrailConditionLayers` in the `map.on('load')` handler**

After `addRoadLayers(map)` (~line 352), add:

```js
try { addTrailConditionLayers(map) } catch (e) { console.error('Trail condition layers failed:', e) }
```

**Step 4: Add visibility toggle useEffect**

After the `showFires` useEffect block (~line 1079), add:

```js
  // Toggle trail conditions
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const vis = showTrailConditions ? 'visible' : 'none'
    for (const id of ['trail-paved', 'trail-gravel', 'trail-dirt', 'trail-rough']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
  }, [showTrailConditions])
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Success

**Step 6: Commit**

```bash
git add src/components/Map.jsx
git commit -m "feat: wire up trail condition layers with visibility toggle in Map"
```

---

### Task 3: Add State in App.jsx and Pass Props

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add state**

After `const [show3DTerrain, setShow3DTerrain] = useState(false)` (~line 21), add:

```js
const [showTrailConditions, setShowTrailConditions] = useState(false)
```

**Step 2: Pass to SidePanel**

In the `<SidePanel>` props, after `onToggle3DTerrain`, add:

```js
showTrailConditions={showTrailConditions}
onToggleTrailConditions={() => setShowTrailConditions(!showTrailConditions)}
```

**Step 3: Pass to Map**

In the `<Map>` props, after `show3DTerrain`, add:

```js
showTrailConditions={showTrailConditions}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Success

**Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add showTrailConditions state and wire to Map and SidePanel"
```

---

### Task 4: Add Toggle Card to SidePanel Layers

**Files:**
- Modify: `src/components/SidePanel.jsx`

**Step 1: Accept new props in SidePanel and LayersPanel**

Add `showTrailConditions` and `onToggleTrailConditions` to both the `SidePanel` component props and the `LayersPanel` component props, following the existing pattern for the other layer toggles.

Pass them through: `<LayersPanel ... showTrailConditions={showTrailConditions} onToggleTrailConditions={onToggleTrailConditions} />`

**Step 2: Add LayerCard in LayersPanel**

After the `3D Terrain` LayerCard (~line 236), add:

```jsx
<LayerCard
  label="Road Conditions"
  desc="Off-road track surface quality"
  checked={showTrailConditions}
  onChange={onToggleTrailConditions}
  color="bg-yellow-500"
  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>}
>
  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
    <LegendItem color="#22c55e" label="Paved" />
    <LegendItem color="#eab308" label="Gravel" />
    <LegendItem color="#f97316" label="Dirt" />
    <LegendItem color="#ef4444" label="Rough/Unknown" />
  </div>
</LayerCard>
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Success

**Step 4: Commit**

```bash
git add src/components/SidePanel.jsx
git commit -m "feat: add Road Conditions toggle with legend to Layers panel"
```

---

### Task 5: End-to-End Verification

**Step 1:** Run `npm run build` — should succeed

**Step 2:** Run `npm run dev` and manually verify:
- Open Layers panel
- Toggle "Road Conditions" on
- Zoom to ~12+ on an area with known off-road tracks (e.g., Moab, UT or Death Valley)
- Verify colored lines appear on tracks
- Toggle off — lines disappear
- Verify legend colors match the layer colors

**Step 3:** Final commit if any fixes needed

---

## Notes

- **No new API calls** — this uses data already in the `openfree` vector tiles
- **No new dependencies** — pure MapLibre style layers
- **Surface coverage varies** — popular off-road areas (Moab, Death Valley, Sedona) have good OSM surface tagging. Remote areas may show mostly red (unknown). This is inherent to OSM data quality.
- **Performance** — vector tile filtering is GPU-accelerated, no impact on load time
- **Future enhancement** — could add Overpass query for richer metadata (tracktype grade1-5) or USFS road maintenance levels as a separate data source
