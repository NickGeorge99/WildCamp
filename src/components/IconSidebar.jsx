export default function IconSidebar({ activePanel, onPanelChange, user, onLoginClick, onLogout }) {
  const isActive = (p) => activePanel === p

  return (
    <div className="icon-sidebar flex items-center md:flex-col md:items-center bg-gray-900 text-gray-400 py-2 md:py-3 px-2 md:px-0 gap-1 z-40">
      {/* Logo — hidden on mobile to save space */}
      <div className="hidden md:block mb-3 px-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>

      {/* Waypoints */}
      <IconButton
        active={isActive('waypoints')}
        onClick={() => onPanelChange(isActive('waypoints') ? null : 'waypoints')}
        label="Waypoints"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </IconButton>

      {/* Layers */}
      <IconButton
        active={isActive('layers')}
        onClick={() => onPanelChange(isActive('layers') ? null : 'layers')}
        label="Layers"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 01-1.806-2.236l.29-2.314" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7l8.445 3.168a1 1 0 00.71 0L21 7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l8.445 3.168a1 1 0 00.71 0L21 12" />
      </IconButton>

      {/* Search */}
      <IconButton
        active={isActive('search')}
        onClick={() => onPanelChange(isActive('search') ? null : 'search')}
        label="Search"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </IconButton>

      {/* Spacer — pushes account to right on mobile, bottom on desktop */}
      <div className="flex-1" />

      {/* Account */}
      {user ? (
        <button
          onClick={onLogout}
          className="icon-btn group relative"
          title={`Log out (${user.email})`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onLoginClick}
          className="icon-btn"
          title="Log In"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
        </button>
      )}
    </div>
  )
}

function IconButton({ active, onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      className={`icon-btn ${active ? 'icon-btn-active' : ''}`}
      title={label}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {children}
      </svg>
    </button>
  )
}
