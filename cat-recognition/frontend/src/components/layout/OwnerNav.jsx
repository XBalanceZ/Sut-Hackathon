import { NavLink } from 'react-router-dom'

const items = [
  { to: '/owner/register', icon: '📸', label: 'สแกน' },
  { to: '/owner/sos', icon: '🆘', label: 'SOS' },
  { to: '/owner/track', icon: '📍', label: 'ติดตาม' },
  { to: '/', icon: '🏠', label: 'หน้าแรก' },
]

export default function OwnerNav() {
  return (
    <nav className="meow-bottom-nav" aria-label="เมนูเจ้าของแมว">
      {items.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `meow-nav-item${isActive ? ' active' : ''}`
          }
          end={to === '/'}
        >
          <span className="nav-icon" aria-hidden="true">
            {icon}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
