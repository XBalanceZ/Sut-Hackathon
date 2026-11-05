import { NavLink } from 'react-router-dom'

const items = [
  { to: '/finder/scan', icon: '📷', label: 'สแกน' },
  { to: '/finder/match', icon: '🎯', label: 'ผลลัพธ์' },
  { to: '/finder/wallet', icon: '💰', label: 'กระเป๋า' },
  { to: '/', icon: '🏠', label: 'หน้าแรก' },
]

export default function FinderNav() {
  return (
    <nav className="meow-bottom-nav" aria-label="เมนูพลเมืองดี">
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
