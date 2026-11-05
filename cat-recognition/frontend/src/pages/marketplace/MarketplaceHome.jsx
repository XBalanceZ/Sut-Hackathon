import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'
import './marketplace.css'

const categories = [
  { id: 'ทั้งหมด', icon: '🏠', label: 'ทั้งหมด', gradient: 'linear-gradient(135deg, #b57bee, #a18cd1)' },
  { id: 'ตามหาแมวหาย', icon: '🛰️', label: 'ตามหาแมวหาย', gradient: 'linear-gradient(135deg, #ff7a45, #ffd166)', path: '/lost-cats' },
  { id: 'โรงแรมแมว', icon: '🏨', label: 'โรงแรมแมว', gradient: 'linear-gradient(135deg, #89f7fe, #66a6ff)', path: '/shelters' },
  { id: 'คอร์สคลินิก', icon: '🏥', label: 'คลินิก', gradient: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)', path: '/clinics' },
  { id: 'อาหารแมว', icon: '🍖', label: 'อาหาร', gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)' },
  { id: 'อุปกรณ์แมว', icon: '🧸', label: 'อุปกรณ์', gradient: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)' },
]

export default function MarketplaceHome() {
  const [cats, setCats] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [favoriteIds, setFavoriteIds] = useState(() => new Set())
  const bannerRef = useRef(null)
  const navigate = useNavigate()

  const fetchCats = useCallback(async (query = '') => {
    setLoading(true)
    try {
      let url = 'http://localhost:8000/api/cats'
      
      if (query === 'อาหารแมว') {
        url += '?category=food'
      } else if (query === 'อุปกรณ์แมว') {
        url += '?category=accessory'
      } else if (query) {
        url += `?q=${encodeURIComponent(query)}`
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCats(data.results || [])
      } else {
        setCats([])
      }
    } catch (err) {
      console.error("Failed to fetch items:", err)
      setCats([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCats()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchCats])

  // Auto-scroll banners
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % 3
        if (bannerRef.current) {
          const bannerWidth = bannerRef.current.firstChild?.offsetWidth || 280
          bannerRef.current.scrollTo({ left: next * (bannerWidth + 12), behavior: 'smooth' })
        }
        return next
      })
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setActiveFilter('ทั้งหมด')
    fetchCats(searchQuery)
  }

  const handleFilterClick = (filterName) => {
    setActiveFilter(filterName)
    setSearchQuery('')
    if (filterName === 'ทั้งหมด') {
      fetchCats('')
    } else {
      fetchCats(filterName)
    }
  }

  const toggleFavorite = (e, catId) => {
    e.preventDefault()
    e.stopPropagation()
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
  }

  return (
    <MobileShell title="Cat Marketplace" hideHeaderIcon>
      <div className="marketplace-container">

        {/* Search Bar */}
        <div className="search-bar-wrapper">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              placeholder="ค้นหาพันธุ์ สี หรือชื่อแมว..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">🔍</button>
          </form>
          <button className="camera-search-btn" onClick={() => navigate('/search')} title="ค้นหาด้วยรูปภาพ">
            📷 สแกน
          </button>
        </div>

        {/* Ad Banners (Auto-Scrollable) */}
        <div className="ad-banner-container" ref={bannerRef}>
          <div className="ad-banner" style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' }}>
            <div className="ad-text">
              <h3>อาหารแมวเกรดพรีเมียม</h3>
              <p>ลดสูงสุด 50% วันนี้เท่านั้น!</p>
            </div>
            <div className="ad-img">🍖</div>
          </div>
          <div className="ad-banner" style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }}>
            <div className="ad-text">
              <h3>โปรโมชั่นตรวจสุขภาพ</h3>
              <p>คลินิกใกล้บ้าน เริ่มต้น 299.-</p>
            </div>
            <div className="ad-img">🩺</div>
          </div>
          <div className="ad-banner" style={{ background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' }}>
            <div className="ad-text">
              <h3>คอนโดแมวใหม่ล่าสุด</h3>
              <p>ฟรีค่าจัดส่งทั่วประเทศ!</p>
            </div>
            <div className="ad-img">🏠</div>
          </div>
        </div>

        {/* Banner Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px', marginBottom: '16px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: bannerIndex === i ? '20px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: bannerIndex === i ? 'var(--meow-purple)' : '#ddd',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {/* Category Cards */}
        <h3 style={{ fontSize: '1rem', margin: '0 12px 10px', fontWeight: '700' }}>🗂️ หมวดหมู่</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '0 12px', marginBottom: '20px' }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              onClick={() => cat.path ? navigate(cat.path) : handleFilterClick(cat.id)}
              style={{
                background: activeFilter === cat.id ? cat.gradient : '#fff',
                border: activeFilter === cat.id ? 'none' : '1px solid var(--meow-border)',
                borderRadius: '16px',
                padding: '14px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: activeFilter === cat.id ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
                transform: activeFilter === cat.id ? 'scale(1.03)' : 'scale(1)'
              }}
            >
              <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: '4px' }}>{cat.icon}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: activeFilter === cat.id ? '#fff' : 'var(--meow-text)' }}>{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Listings Grid */}
        <h3 style={{ fontSize: '1rem', margin: '0 12px 10px', fontWeight: '700' }}>🐾 รายการ</h3>
        <div className="cat-grid">
          {loading ? (
            <p className="loading-text">กำลังโหลด...</p>
          ) : cats.length === 0 ? (
            <p className="empty-state">ไม่พบแมวที่ตรงกับคำค้นหา 😿</p>
          ) : (
            cats.map((cat) => (
              <div key={cat.id} className="cat-card">
                <div className="cat-image-wrapper">
                  <Link to={`/cat/${cat.id}`} className="cat-image-link">
                    {cat.mockImage ? (
                      <img src={cat.mockImage} alt={cat.name} className="cat-image" />
                    ) : cat.image_url ? (
                      <img src={`http://localhost:8000${cat.image_url}`} alt={cat.name} className="cat-image" />
                    ) : (
                      <div className="cat-image-placeholder">{cat.category === 'food' ? '🍖' : cat.category === 'accessory' ? '🧸' : '🐱'}</div>
                    )}
                  </Link>
                  <button
                    type="button"
                    className={`favorite-btn ${favoriteIds.has(cat.id) ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(e, cat.id)}
                    aria-label={favoriteIds.has(cat.id) ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                  >
                    ♥
                  </button>
                </div>
                <Link to={`/cat/${cat.id}`} className="cat-card-link">
                  <div className="cat-info">
                    <h3 className="cat-name" style={{ marginBottom: '4px' }}>{cat.name}</h3>

                    {/* Discount Price Section */}
                    <div className="cat-price-row">
                      <span className="cat-current-price">
                        {cat.price > 0 ? `${cat.price.toLocaleString()} บาท` : 'ฟรี'}
                      </span>
                      {cat.price > 0 && (
                        <span className="cat-original-price">
                          {(cat.price * 1.15).toLocaleString()} บาท
                        </span>
                      )}
                    </div>

                    {/* Shop Name & KYC */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>{cat.seller?.name || 'Cattery Home Farm'}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#e6f4ea', color: '#1e7e34', padding: '2px 6px', borderRadius: '4px' }}>KYC</span>
                    </div>

                    <div className="cat-meta" style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f3f5' }}>
                      {(cat.category && cat.category !== 'cat') ? (
                        <>
                          <span>📦 จัดส่งฟรีทั่วประเทศ</span>
                          <span className="cat-location">⭐ 4.9</span>
                        </>
                      ) : (
                        <>
                          <span>{cat.gender === 'male' ? '♂️' : cat.gender === 'female' ? '♀️' : '⚪'} {cat.estimated_age}</span>
                          <span className="cat-location">📍 {cat.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>

      </div>
      <BottomNav />
    </MobileShell>
  )
}
