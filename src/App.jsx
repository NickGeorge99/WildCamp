import { useState, useEffect } from 'react'
import IconSidebar from './components/IconSidebar'
import SidePanel from './components/SidePanel'
import Map from './components/Map'
import AddSpotModal from './components/AddSpotModal'
import AuthModal from './components/AuthModal'
import { supabase } from './lib/supabase'

export default function App() {
  const [user, setUser] = useState(null)
  const [spots, setSpots] = useState([])
  const [pendingLatLng, setPendingLatLng] = useState(null)
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [showPublicLands, setShowPublicLands] = useState(true)
  const [showSpots, setShowSpots] = useState(true)
  const [flyTo, setFlyTo] = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadSpots()
  }, [user])

  async function loadSpots() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setSpots(data)
  }

  function handleMapClick(latlng) {
    if (!user) {
      setShowAuth(true)
      return
    }
    setPendingLatLng(latlng)
  }

  async function handleSubmitSpot(spot) {
    if (supabase && user) {
      const { data, error } = await supabase
        .from('spots')
        .insert([{ ...spot, user_id: user.id }])
        .select()
      if (!error && data) setSpots((prev) => [data[0], ...prev])
    } else {
      setSpots((prev) => [
        { ...spot, id: crypto.randomUUID(), user_id: 'demo', created_at: new Date().toISOString() },
        ...prev,
      ])
    }
    setPendingLatLng(null)
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }

  function handleSearch(location) {
    setFlyTo({ ...location, _ts: Date.now() })
  }

  function handleFlyToSpot(spot) {
    setFlyTo({ lat: spot.lat, lng: spot.lng, zoom: 14, _ts: Date.now() })
    setSelectedSpot(spot)
    // Close panel on mobile
    if (window.innerWidth < 768) setActivePanel(null)
  }

  return (
    <div className="app-layout">
      <IconSidebar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        user={user}
        onLoginClick={() => setShowAuth(true)}
        onLogout={handleLogout}
      />

      <SidePanel
        activePanel={activePanel}
        onClose={() => setActivePanel(null)}
        spots={spots}
        user={user}
        showPublicLands={showPublicLands}
        onTogglePublicLands={() => setShowPublicLands(!showPublicLands)}
        showSpots={showSpots}
        onToggleSpots={() => setShowSpots(!showSpots)}
        onSearch={handleSearch}
        onFlyToSpot={handleFlyToSpot}
        onLoginClick={() => setShowAuth(true)}
      />

      <div className="map-container flex-1 relative">
        <Map
          spots={spots}
          onMapClick={handleMapClick}
          selectedSpot={selectedSpot}
          onSpotClick={setSelectedSpot}
          showPublicLands={showPublicLands}
          showSpots={showSpots}
          flyTo={flyTo}
        />
      </div>

      {pendingLatLng && (
        <AddSpotModal
          latlng={pendingLatLng}
          onSubmit={handleSubmitSpot}
          onClose={() => setPendingLatLng(null)}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={(u) => {
            setUser(u)
            setShowAuth(false)
          }}
        />
      )}
    </div>
  )
}
