import { useState, useEffect } from 'react'
import { shareOrCopy } from '../lib/share'
import { supabase } from '../lib/supabase'

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
  showFires,
  onToggleFires,
  show3DTerrain,
  onToggle3DTerrain,
  onSearch,
  onFlyToSpot,
  onLoginClick,
  onDeleteSpot,
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
            <WaypointsPanel spots={spots} user={user} onFlyTo={onFlyToSpot} onLoginClick={onLoginClick} onDelete={onDeleteSpot} />
          )}
          {activePanel === 'layers' && (
            <LayersPanel
              showPublicLands={showPublicLands}
              onTogglePublicLands={onTogglePublicLands}
              showSpots={showSpots}
              onToggleSpots={onToggleSpots}
              showCellCoverage={showCellCoverage}
              onToggleCellCoverage={onToggleCellCoverage}
              showFires={showFires}
              onToggleFires={onToggleFires}
              show3DTerrain={show3DTerrain}
              onToggle3DTerrain={onToggle3DTerrain}
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
function WaypointsPanel({ spots, user, onFlyTo, onLoginClick, onDelete }) {
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

  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestLoading, setDigestLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) return
    supabase
      .from('notification_preferences')
      .select('digest_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDigestEnabled(data.digest_enabled)
        setDigestLoading(false)
      })
  }, [user])

  async function toggleDigest() {
    if (!supabase) return
    const next = !digestEnabled
    setDigestEnabled(next)
    await supabase
      .from('notification_preferences')
      .upsert({ user_id: user.id, digest_enabled: next }, { onConflict: 'user_id' })
  }

  return (
    <div className="mt-2 space-y-1">
      {userSpots.map((s) => (
        <div
          key={s.id}
          onClick={() => onFlyTo(s)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-700/50 transition-colors group cursor-pointer"
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
          {s.share_token && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const url = `${window.location.origin}?spot=${s.share_token}`
                shareOrCopy(url, s.name, e.currentTarget)
              }}
              className="p-1 text-gray-500 hover:text-orange-400 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="Share spot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(s.id)
            }}
            className="p-1 text-gray-500 hover:text-red-400 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
            title="Remove waypoint"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {/* Weekly digest toggle */}
      {!digestLoading && (
        <div
          className="flex items-center gap-3 px-3 py-2.5 mt-3 rounded-lg border border-gray-700/50 bg-gray-800/30 cursor-pointer hover:bg-gray-700/30 transition-colors"
          onClick={toggleDigest}
        >
          <span className="text-sm">📧</span>
          <span className="flex-1 text-xs text-gray-400">Weekly digest — new spots & photos near you</span>
          <div className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${digestEnabled ? 'bg-orange-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${digestEnabled ? 'translate-x-4' : ''}`} />
          </div>
        </div>
      )}
    </div>
  )
}

// --- Layers ---
function LayersPanel({ showPublicLands, onTogglePublicLands, showSpots, onToggleSpots, showCellCoverage, onToggleCellCoverage, showFires, onToggleFires, show3DTerrain, onToggle3DTerrain }) {
  return (
    <div className="mt-1 space-y-1.5">
      <LayerCard
        label="Public Lands"
        desc="BLM, USFS, NPS & more"
        checked={showPublicLands}
        onChange={onTogglePublicLands}
        color="bg-yellow-500"
        icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15" /></svg>}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <LegendItem color="#e6b428" label="BLM" />
          <LegendItem color="#228b22" label="USFS" />
          <LegendItem color="#644628" label="NPS" />
          <LegendItem color="#32b4b4" label="FWS" />
          <LegendItem color="#b45050" label="DOD" />
        </div>
      </LayerCard>

      <LayerCard
        label="Campsites"
        desc="User, OSM, federal & USFS"
        checked={showSpots}
        onChange={onToggleSpots}
        color="bg-orange-500"
        icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <LegendItem color="#f97316" label="User" circle />
          <LegendItem color="#22c55e" label="OSM" circle />
          <LegendItem color="#3b82f6" label="Rec.gov" circle />
          <LegendItem color="#a855f7" label="USFS" circle />
          <LegendItem color="#14b8a6" label="NPS" circle />
        </div>
      </LayerCard>

      <LayerCard
        label="Cell Coverage"
        desc="FCC broadband data"
        checked={showCellCoverage}
        onChange={onToggleCellCoverage}
        color="bg-blue-500"
        icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <LegendItem color="#1e40af" label="5G Fast" />
          <LegendItem color="#60a5fa" label="5G" />
          <LegendItem color="#5eead4" label="4G LTE" />
        </div>
      </LayerCard>

      <LayerCard
        label="Active Fires"
        desc="NIFC live wildfire data"
        checked={showFires}
        onChange={onToggleFires}
        color="bg-red-500"
        icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" /></svg>}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <LegendItem color="#ef4444" label="Perimeter" />
          <LegendItem color="#f97316" label="Wildfire" circle />
          <LegendItem color="#fbbf24" label="Prescribed" circle />
        </div>
      </LayerCard>

      <LayerCard
        label="3D Terrain"
        desc="Elevation & hillshade"
        checked={show3DTerrain}
        onChange={onToggle3DTerrain}
        color="bg-emerald-500"
        icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2 22L8.5 9l4.5 8 3-4 6 9H2z" /></svg>}
      />
    </div>
  )
}

function LayerCard({ label, desc, checked, onChange, color, icon, children }) {
  return (
    <div
      className={`rounded-lg border transition-colors cursor-pointer ${
        checked
          ? 'bg-gray-700/50 border-gray-600'
          : 'bg-gray-800/30 border-gray-700/50'
      }`}
      onClick={onChange}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          checked ? 'bg-gray-600/60 text-gray-200' : 'bg-gray-700/40 text-gray-500'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium transition-colors ${checked ? 'text-gray-100' : 'text-gray-400'}`}>{label}</div>
          {desc && <div className="text-[11px] text-gray-500 leading-tight">{desc}</div>}
        </div>
        <div
          className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${checked ? color : 'bg-gray-600'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
        </div>
      </div>
      {checked && children && (
        <div className="px-3 pb-2.5 pt-0" onClick={(e) => e.stopPropagation()}>
          <div className="pt-2 border-t border-gray-600/50 text-[11px]">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function LegendItem({ color, label, circle }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={circle ? 'w-2.5 h-2.5 rounded-full' : 'w-3.5 h-2.5 rounded-sm'}
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
