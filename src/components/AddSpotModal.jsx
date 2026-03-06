import { useState } from 'react'

export default function AddSpotModal({ latlng, onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [vehicleType, setVehicleType] = useState('any')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    await onSubmit({
      name: name.trim(),
      notes: notes.trim(),
      vehicle_type: vehicleType,
      is_public: isPublic,
      lat: latlng.lat,
      lng: latlng.lng,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-700">
        <h2 className="text-lg font-bold text-gray-100 mb-1">New Waypoint</h2>
        <p className="text-sm text-gray-400 mb-4">
          {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hidden Valley Camp"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Vehicle Access
            </label>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Visibility
            </label>
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
              {isPublic ? 'Visible to all users' : 'Only visible to you'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cell service? Water nearby? Road conditions?"
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Waypoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
