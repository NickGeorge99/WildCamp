import { useState, useEffect } from 'react'

export default function PhotoViewer({ images, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  if (!images || images.length === 0) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-sm text-gray-400">
          {index + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left arrow */}
        {index > 0 && (
          <button
            onClick={() => setIndex(index - 1)}
            className="absolute left-2 md:left-4 p-2 text-white/60 hover:text-white transition-colors z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <img
          src={images[index]}
          alt=""
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
          onTouchStart={(e) => { e.currentTarget._touchX = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - (e.currentTarget._touchX || 0)
            if (dx > 60 && index > 0) setIndex(index - 1)
            if (dx < -60 && index < images.length - 1) setIndex(index + 1)
          }}
        />

        {/* Right arrow */}
        {index < images.length - 1 && (
          <button
            onClick={() => setIndex(index + 1)}
            className="absolute right-2 md:right-4 p-2 text-white/60 hover:text-white transition-colors z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="flex gap-2 px-4 pb-4 justify-center flex-shrink-0 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                i === index ? 'border-orange-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
