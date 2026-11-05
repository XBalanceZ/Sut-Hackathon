import { Link, useLocation } from 'react-router-dom'

import { useState, useEffect } from 'react'

export default function BottomNav() {
  const location = useLocation()
  const [role, setRole] = useState(() => localStorage.getItem('mockRole') || 'buyer')

  useEffect(() => {
    const syncRole = () => setRole(localStorage.getItem('mockRole') || 'buyer')
    window.addEventListener('mockRoleChanged', syncRole)
    window.addEventListener('storage', syncRole)

    return () => {
      window.removeEventListener('mockRoleChanged', syncRole)
      window.removeEventListener('storage', syncRole)
    }
  }, [location.pathname])

  const buyerTabs = [
    { path: '/', label: 'หน้าหลัก', icon: '🛒' },
    { path: '/orders', label: 'ออเดอร์', icon: '📋' },
    { path: '/chat/1', label: 'แชท', icon: '💬' },
    { path: '/settings', label: 'ตั้งค่า', icon: '⚙️' }
  ]

  const sellerTabs = [
    { path: '/sell-dashboard', label: 'จัดการร้าน', icon: '🏪' },
    { path: '/orders', label: 'ออเดอร์', icon: '📋' },
    { path: '/chat/1', label: 'แชท', icon: '💬' },
    { path: '/settings', label: 'ตั้งค่า', icon: '⚙️' },
  ]

  const tabs = role === 'seller' ? sellerTabs : buyerTabs

  return (
    <div className="meow-bottom-nav">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`meow-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
