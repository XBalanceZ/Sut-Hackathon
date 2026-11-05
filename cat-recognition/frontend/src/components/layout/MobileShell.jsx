import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/meow-theme.css'

export function MobileShell({
  title,
  badge,
  backTo,
  onBack,
  children,
  footer,
  noNav = false,
  hideRoleSwitch = false,
}) {
  const [role, setRole] = useState(() => localStorage.getItem('mockRole') || 'buyer')

  useEffect(() => {
    const syncRole = () => setRole(localStorage.getItem('mockRole') || 'buyer')
    window.addEventListener('mockRoleChanged', syncRole)
    window.addEventListener('storage', syncRole)

    return () => {
      window.removeEventListener('mockRoleChanged', syncRole)
      window.removeEventListener('storage', syncRole)
    }
  }, [])

  const handleBack = (e) => {
    if (onBack) {
      e.preventDefault()
      onBack()
    }
  }

  return (
    <div className="meow-app">
      <header className="meow-header">
        {(backTo || onBack) ? (
          backTo ? (
            <Link to={backTo} className="meow-header-back" aria-label="กลับ">
              ←
            </Link>
          ) : (
            <button onClick={handleBack} className="meow-header-back" aria-label="กลับ">
              ←
            </button>
          )
        ) : (
          <span className="meow-header-back" style={{ visibility: 'hidden' }}>
            ←
          </span>
        )}
        <h1 className="meow-header-title">{title}</h1>
        {badge && <span className="meow-header-badge" style={{ marginRight: '6px' }}>{badge}</span>}
        
        {/* Role switch button removed as requested */}
      </header>
      <main className={`meow-main ${noNav ? 'no-nav' : ''}`}>{children}</main>
      {footer}
    </div>
  )
}
