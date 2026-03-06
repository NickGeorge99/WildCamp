import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function EditSpotModal({ spot, onClose, onUpdate, onDelete }) {
  const [name, setName] = useState(spot.name)
  const [notes, setNotes] = useState(spot.notes || '')
  const [vehicleType, setVehicleType] = useState(spot.vehicle_type || 'any')
  const [isPublic, setIsPublic] = useState(spot.is_public)
  const [images, setImages] = useState(spot.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef(null)

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length || !supabase) return
    setUploading(true)

    const newUrls = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `spots/${spot.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('spot-images').upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      })
      if (!error) {
        const { data } = supabase.storage.from('spot-images').getPublicUrl(path)
        if (data?.publicUrl) newUrls.push(data.publicUrl)
      }
    }

    if (newUrls.length > 0) setImages((prev) => [...prev, ...newUrls])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleRemoveImage(url) {
    setImages((prev) => prev.filter((u) => u !== url))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onUpdate({
      id: spot.id,
      name: name.trim(),
      notes: notes.trim(),
      vehicle_type: vehicleType,
      is_public: isPublic,
      images,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await onDelete(spot.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-lg font-bold text-gray-100">Edit Waypoint</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-sm text-gray-400">
            {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle Access</label>
            <div className="flex gap-2">
              {[
                { value: 'any', label: 'Any Vehicle' },
                { value: '4wd', label: '4WD Only' },
                { value: 'hike-in', label: 'Hike-in' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVehicleType(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    vehicleType === opt.value
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-orange-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Visibility</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  isPublic
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-orange-400'
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  !isPublic
                    ? 'bg-gray-600 text-white border-gray-500'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                }`}
              >
                Private
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {isPublic ? 'Visible to all users on the map' : 'Only visible to you'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cell service? Water nearby? Road conditions?"
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Photos</label>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-700">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(url)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      style={{ opacity: 'inherit' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span>Add Photos</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-700 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          <button
            onClick={handleDelete}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-red-400 hover:bg-red-500/10'
            }`}
          >
            {confirmDelete ? 'Tap again to confirm delete' : 'Delete Waypoint'}
          </button>
        </div>
      </div>
    </div>
  )
}
