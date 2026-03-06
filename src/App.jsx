import { useState, useEffect } from 'react'
import IconSidebar from './components/IconSidebar'
import SidePanel from './components/SidePanel'
import Map from './components/Map'
import AddSpotModal from './components/AddSpotModal'
import EditSpotModal from './components/EditSpotModal'
import PhotoViewer from './components/PhotoViewer'
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
  const [showCellCoverage, setShowCellCoverage] = useState(false)
  const [showFires, setShowFires] = useState(true)
  const [show3DTerrain, setShow3DTerrain] = useState(false)
  const [flyTo, setFlyTo] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [drawMode, setDrawMode] = useState(false)
  const [editingSpot, setEditingSpot] = useState(null)
  const [viewingPhotos, setViewingPhotos] = useState(null)

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

  // Handle ?spot=<token> share links
  useEffect(() => {
    if (!supabase) return
    const params = new URLSearchParams(window.location.search)
    const spotToken = params.get('spot')
    if (!spotToken) return

    supabase.rpc('get_spot_by_share_token', { token: spotToken }).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        const spot = data[0]
        setFlyTo({ lat: spot.lat, lng: spot.lng, zoom: 14, _ts: Date.now() })
        setSelectedSpot(spot)
        window.history.replaceState({}, '', window.location.pathname)
      }
    })
  }, [])

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
    setDrawMode(false)
  }

  async function handleSaveAndGetId(spotData) {
    if (!supabase || !user) return null
    const { data, error } = await supabase
      .from('spots')
      .insert([{ ...spotData, user_id: user.id, is_public: true }])
      .select()
    if (!error && data) {
      setSpots((prev) => [data[0], ...prev])
      return data[0].id
    }
    return null
  }

  async function handleSaveExisting(spotData) {
    if (!user) {
      setShowAuth(true)
      return
    }
    if (supabase) {
      const { data, error } = await supabase
        .from('spots')
        .insert([{ ...spotData, user_id: user.id, is_public: false }])
        .select()
      if (!error && data) setSpots((prev) => [data[0], ...prev])
    } else {
      setSpots((prev) => [
        { ...spotData, id: crypto.randomUUID(), user_id: 'demo', is_public: false, created_at: new Date().toISOString() },
        ...prev,
      ])
    }
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

  async function handleUpdateSpot(updated) {
    if (supabase) {
      const { id, ...fields } = updated
      const { data, error } = await supabase
        .from('spots')
        .update(fields)
        .eq('id', id)
        .select()
      if (!error && data) {
        setSpots((prev) => prev.map((s) => (s.id === id ? data[0] : s)))
        setSelectedSpot(data[0])
      }
    }
    setEditingSpot(null)
  }

  async function handleDeleteSpot(id) {
    if (supabase) {
      await supabase.from('spots').delete().eq('id', id)
    }
    setSpots((prev) => prev.filter((s) => s.id !== id))
    setSelectedSpot(null)
    setEditingSpot(null)
  }

  async function handleRemovePhoto(spotId, photoUrl) {
    if (!supabase || !user) return
    const { error } = await supabase.rpc('remove_spot_photo', {
      spot_id: spotId,
      photo_url: photoUrl,
    })
    if (error) {
      console.error('remove_spot_photo RPC failed:', error)
      return
    }
    const spot = spots.find((s) => s.id === spotId)
    if (spot) {
      const updatedSpot = { ...spot, images: (spot.images || []).filter((u) => u !== photoUrl) }
      setSpots((prev) => prev.map((s) => (s.id === spotId ? updatedSpot : s)))
      if (selectedSpot?.id === spotId) setSelectedSpot(updatedSpot)
    }
  }

  async function handleAddPhoto(spotId, files) {
    console.log('[handleAddPhoto] called with spotId:', spotId, 'files:', files.length)
    if (!supabase || !user) { console.log('[handleAddPhoto] no supabase or user'); return }
    const newUrls = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `spots/${spotId}/${crypto.randomUUID()}.${ext}`
      console.log('[handleAddPhoto] uploading to:', path)
      const { error } = await supabase.storage.from('spot-images').upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      })
      if (error) {
        console.error('[handleAddPhoto] upload failed:', error)
        continue
      }
      const { data } = supabase.storage.from('spot-images').getPublicUrl(path)
      console.log('[handleAddPhoto] publicUrl:', data?.publicUrl)
      if (data?.publicUrl) newUrls.push(data.publicUrl)
    }
    console.log('[handleAddPhoto] newUrls:', newUrls)
    if (newUrls.length > 0) {
      const { error } = await supabase.rpc('add_spot_photos', {
        spot_id: spotId,
        new_urls: newUrls,
      })
      if (error) {
        console.error('[handleAddPhoto] RPC failed:', error)
        return
      }
      console.log('[handleAddPhoto] RPC success, refreshing spot...')
      const { data: refreshed, error: refreshErr } = await supabase
        .from('spots')
        .select('*')
        .eq('id', spotId)
        .single()
      console.log('[handleAddPhoto] refreshed:', refreshed, 'error:', refreshErr)
      if (refreshed) {
        console.log('[handleAddPhoto] images on refreshed spot:', refreshed.images)
        setSpots((prev) => prev.map((s) => (s.id === spotId ? refreshed : s)))
        setSelectedSpot({ ...refreshed })
      }
    }
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
        showCellCoverage={showCellCoverage}
        onToggleCellCoverage={() => setShowCellCoverage(!showCellCoverage)}
        showFires={showFires}
        onToggleFires={() => setShowFires(!showFires)}
        show3DTerrain={show3DTerrain}
        onToggle3DTerrain={() => setShow3DTerrain(!show3DTerrain)}
        onSearch={handleSearch}
        onFlyToSpot={handleFlyToSpot}
        onLoginClick={() => setShowAuth(true)}
        onDeleteSpot={handleDeleteSpot}
      />

      <div className="map-container flex-1 relative">
        <Map
          spots={spots}
          onMapClick={handleMapClick}
          selectedSpot={selectedSpot}
          onSpotClick={setSelectedSpot}
          showPublicLands={showPublicLands}
          showSpots={showSpots}
          showCellCoverage={showCellCoverage}
          showFires={showFires}
          show3DTerrain={show3DTerrain}
          flyTo={flyTo}
          drawMode={drawMode}
          onToggleDrawMode={() => {
            if (!user) { setShowAuth(true); return }
            setDrawMode(!drawMode)
          }}
          onEditSpot={setEditingSpot}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={handleRemovePhoto}
          onSaveAndGetId={handleSaveAndGetId}
          onViewPhotos={setViewingPhotos}
          user={user}
        />
      </div>

      {pendingLatLng && (
        <AddSpotModal
          latlng={pendingLatLng}
          onSubmit={handleSubmitSpot}
          onClose={() => setPendingLatLng(null)}
        />
      )}

      {viewingPhotos && (
        <PhotoViewer
          images={viewingPhotos.images}
          startIndex={viewingPhotos.index || 0}
          onClose={() => setViewingPhotos(null)}
        />
      )}

      {editingSpot && (
        <EditSpotModal
          spot={editingSpot}
          onClose={() => setEditingSpot(null)}
          onUpdate={handleUpdateSpot}
          onDelete={handleDeleteSpot}
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
