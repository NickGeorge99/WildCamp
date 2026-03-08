# WildCamp Frontend Designer Memory

## Project Overview
- React + Vite app, single-page map-based camping spot finder
- Map engine: MapLibre GL JS
- Styling: plain CSS with `wc-` prefix convention (no Tailwind in this project)
- Build: `npm run build` (Vite), target modern browsers

## Key Files
- `src/components/Map.jsx` — monolithic map component (~1000+ lines), all popup logic lives here
- `src/index.css` — all custom CSS, uses `wc-` prefix for popup/component classes
- `src/lib/mapStyle.js` — map tile style + layer helpers
- `src/lib/markers.js` — marker image registration

## CSS Architecture
All popup styles are in `src/index.css` with `wc-` prefix:
- `.wildcamp-popup` — MapLibre popup wrapper (dark theme: bg #1f2937, border #374151, border-radius 14px)
- `.wc-popup` / `.wc-popup-body` — flex column container + padded body (12px 14px 14px)
- `.wc-popup-tags` + `.wc-tag` — pill badges (10px, 700 weight, uppercase, 4px border-radius)
- `.wc-popup-name` — 18px 700 weight, color #f3f4f6
- `.wc-popup-meta` — 13px #9ca3af, flex row with icon + text, margin-top 4px
- `.wc-popup-coords` — copyable row with pinSmall icon, border-top #374151, cursor pointer
- `.wc-btn-navigate` — full-width blue gradient button (135deg #2563eb → #3b82f6)
- `.wc-btn-save` — orange (#f97316) full-width button
- `.wc-popup-secondary` — flex row of `.wc-btn-sec` secondary action buttons
- Tag color variants: `.wc-tag-location` = #475569 (slate)

## ICON Object Pattern (Map.jsx top-level)
SVG strings stored in `const ICON = { copy, navigate, share, pin, pinSmall, edit, camera, vehicle, lock, globe, chevronL, chevronR }`.
- `ICON.pinSmall` — red fill pin, used for coords row left icon
- `ICON.copy` — used as right icon in coords row for visual affordance
- `ICON.navigate` — paper-plane polygon, used in navigate button
- `ICON.pin` — outline pin with circle, used in meta lines

## Key Utility Functions (Map.jsx)
- `getNavUrl(lat, lng)` — returns Apple Maps URL on iOS, Google Maps otherwise
- `copyToClipboard(text, btn)` — writes to clipboard, flashes "Copied!" green for 1500ms
- `buildPopupHTML(props, { isOwner, isLoggedIn })` — builds spot popup HTML string (DO NOT MODIFY)
- `showLocationPopup(m, lngLat)` — async, builds location popup for empty map taps

## Popup Pattern: showLocationPopup
Structure mirrors buildPopupHTML exactly:
1. Render immediately with skeleton ("Loading...") and `visibility:hidden` meta
2. Fire `Promise.allSettled([nominatim, open-meteo/elevation])` in parallel
3. Fill name from Nominatim address hierarchy: tourism > natural > leisure > park > hamlet > village > town > city > county > display_name[0]
4. Fill meta line: county + state from Nominatim address, elevation in ft from open-meteo
5. `visibility:hidden` → `visible` only if meta parts exist (avoids empty row flash)
6. Coords row layout: pinSmall icon | coords text | copy icon (full row is clickable)

## External APIs Used
- Nominatim reverse geocode: `https://nominatim.openstreetmap.org/reverse?lat=&lon=&format=json&zoom=14`
- Open-Meteo elevation: `https://api.open-meteo.com/v1/elevation?latitude=&longitude=` → `{ elevation: [float] }`
- Both fetched with `AbortSignal.timeout(6000)` and wrapped in `Promise.allSettled`

## MapLibre Popup Pattern
```js
popupRef.current = new maplibregl.Popup({
  closeButton: true,
  maxWidth: '340px',
  className: 'wildcamp-popup',
}).setLngLat(lngLat).setHTML(htmlString).addTo(m)
// After addTo, attach event listeners via popupRef.current.getElement().querySelector(...)
```
Always check `popupRef.current?.getElement()?.querySelector(...)` (optional chain) after async gaps since user may have closed popup.
