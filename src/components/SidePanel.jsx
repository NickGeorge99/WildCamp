import { useState } from 'react'

export default function SidePanel({
  activePanel,
  onClose,
  spots,
  user,
  showPublicLands,
  onTogglePublicLands,
  showSpots,
  onToggleSpots,
  showCellCoverage,
  onToggleCellCoverage,
  onSearch,
  onFlyToSpot,
  onLoginClick,
}) {
  if (!activePanel) return null

  return (
    <>
      {/* Mobile backdrop */}
      <div className="side-panel-backdrop md:hidden" onClick={onClose} />

      <div className="side-panel z-30">
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        <div className="flex items-center justify-between px-4 pt-2 md:pt-4 pb-2">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            {activePanel === 'waypoints' && 'Waypoints'}
            {activePanel === 'layers' && 'Layers'}
            {activePanel === 'search' && 'Search'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {activePanel === 'waypoints' && (
            <WaypointsPanel spots={spots} user={user} onFlyTo={onFlyToSpot} onLoginClick={onLoginClick} />
          )}
          {activePanel === 'layers' && (
            <LayersPanel
              showPublicLands={showPublicLands}
              onTogglePublicLands={onTogglePublicLands}
              showSpots={showSpots}
              onToggleSpots={onToggleSpots}
              showCellCoverage={showCellCoverage}
              onToggleCellCoverage={onToggleCellCoverage}
            />
          )}
          {activePanel === 'search' && (
            <SearchPanel onSearch={onSearch} onClose={onClose} />
          )}
        </div>
      </div>
    </>
  )
}

// --- Waypoints ---
function WaypointsPanel({ spots, user, onFlyTo, onLoginClick }) {
  if (!user) {
    return (
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400 mb-3">Log in to see your waypoints</p>
        <button
          onClick={onLoginClick}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Log In
        </button>
      </div>
    )
  }

  const userSpots = spots.filter((s) => s.user_id === user.id)

  if (userSpots.length === 0) {
    return (
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400">Tap the map to add a waypoint</p>
      </div>
    )
  }

  const colorMap = { any: '#22c55e', '4wd': '#f97316', 'hike-in': '#3b82f6' }

  return (
    <div className="mt-2 space-y-1">
      {userSpots.map((s) => (
        <button
          key={s.id}
          onClick={() => onFlyTo(s)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-700/50 transition-colors group"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: colorMap[s.vehicle_type] || colorMap.any }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-200 truncate block">{s.name}</span>
          </div>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            s.is_public ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-600 text-gray-400'
          }`}>
            {s.is_public ? 'PUB' : 'PRV'}
          </span>
        </button>
      ))}
    </div>
  )
}

// --- Layers ---
function LayersPanel({ showPublicLands, onTogglePublicLands, showSpots, onToggleSpots, showCellCoverage, onToggleCellCoverage }) {
  return (
    <div className="mt-2 space-y-5">
      <div className="space-y-2">
        <Toggle label="Public Lands" checked={showPublicLands} onChange={onTogglePublicLands} color="bg-yellow-500" />
        <Toggle label="User Spots" checked={showSpots} onChange={onToggleSpots} color="bg-orange-500" />
        <Toggle label="Cell Coverage" checked={showCellCoverage} onChange={onToggleCellCoverage} color="bg-green-500" />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Public Lands</h3>
        <div className="space-y-1.5 text-sm">
          <LegendItem color="#e6b428" label="BLM" />
          <LegendItem color="#32a03c" label="USFS" />
          <LegendItem color="#78be3c" label="NPS" />
          <LegendItem color="#32a03c" label="FWS" />
          <LegendItem color="#b45050" label="DOD" />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-1.5 text-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Campsites</h3>
          <LegendItem color="#f97316" label="User Submitted" circle />
          <LegendItem color="#22c55e" label="OSM Community" circle />
          <LegendItem color="#3b82f6" label="Recreation.gov (Federal)" circle />
          <LegendItem color="#a855f7" label="USFS Official" circle />
          <LegendItem color="#14b8a6" label="National Park (NPS)" circle />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-1.5 text-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cell Coverage (FCC)</h3>
          <LegendItem color="#1e40af" label="5G (35/3 Mbps)" />
          <LegendItem color="#60a5fa" label="5G (7/1 Mbps)" />
          <LegendItem color="#5eead4" label="4G LTE" />
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange, color }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? color : 'bg-gray-600'}`}
        onClick={onChange}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  )
}

function LegendItem({ color, label, circle }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={circle ? 'w-3 h-3 rounded-full' : 'w-4 h-3 rounded-sm'}
        style={{ backgroundColor: color, opacity: circle ? 1 : 0.6, border: `1px solid ${color}` }}
      />
      <span className="text-gray-400">{label}</span>
    </div>
  )
}

// --- Search ---
function SearchPanel({ onSearch, onClose }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`
      )
      setResults(await res.json())
    } catch {
      setResults([])
    }
    setSearching(false)
  }

  function handleResultClick(r) {
    onSearch({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), zoom: 12 })
    setResults([])
    setQuery(r.display_name.split(',')[0])
    onClose()
  }

  return (
    <div className="mt-2">
      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Moab, Utah"
          className="flex-1 px-3 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          autoFocus
        />
        <button
          type="submit"
          disabled={searching}
          className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
        >
          {searching ? '...' : 'Go'}
        </button>
      </form>
      {results.length > 0 && (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleResultClick(r)}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 border-b border-gray-700 last:border-0 transition-colors"
            >
              {r.display_name.length > 55 ? r.display_name.slice(0, 55) + '...' : r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
