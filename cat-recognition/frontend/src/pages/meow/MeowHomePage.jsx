import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import '../../styles/meow-home.css'

const API = 'http://localhost:8000'

function CatCard({ item }) {
  const imageUrl = item.image_url
    ? item.image_url.startsWith('http')
      ? item.image_url
      : `${API}${item.image_url}`
    : null

  const rewardLabel = item.reward_amount > 0
    ? `฿${item.reward_amount.toLocaleString()}`
    : 'ไม่มีรางวัล'

  return (
    <div className="cat-card">
      {item.premium && <span className="cat-card-premium">⭐ Premium</span>}
      <div className="cat-card-img-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={item.cat_name} className="cat-card-img" />
        ) : (
          <div className="cat-card-img-placeholder">🐱</div>
        )}
      </div>
      <div className="cat-card-body">
        <p className="cat-card-name">{item.cat_name}</p>
        {item.breed && <p className="cat-card-breed">{item.breed}</p>}
        <p className="cat-card-location">📍 {item.missing_location}</p>
        <div className="cat-card-footer">
          <span className={`cat-card-reward ${item.reward_amount > 0 ? 'has-reward' : ''}`}>
            {rewardLabel}
          </span>
          <span className="cat-card-radius">{item.alert_radius_km} กม.</span>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="cat-card skeleton-card">
      <div className="skeleton-img" />
      <div className="cat-card-body">
        <div className="skeleton-line w80" />
        <div className="skeleton-line w50" />
        <div className="skeleton-line w90" />
      </div>
    </div>
  )
}

export default function MeowHomePage() {
  const navigate = useNavigate()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCats = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/lost-cats?limit=30`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCats(data.items || [])
    } catch (e) {
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchCats() }, [fetchCats])

  return (
    <MobileShell title="MEOW MATCH" badge="🐱" noNav>
      {/* Hero Banner */}
      <div className="home-hero">
        <div className="home-hero-text">
          <div className="home-logo">MEOW<br />MATCH</div>
          <p className="home-tagline">ตามหาเพื่อนรักขนปุย — อบอุ่น ปลอดภัย ทันใจ</p>
        </div>
        <div className="home-hero-btns">
          <Link to="/owner/register" className="hero-btn hero-btn-owner">
            <span>🐾</span> เจ้าของแมว
          </Link>
          <Link to="/finder/scan" className="hero-btn hero-btn-finder">
            <span>🔍</span> พลเมืองดี
          </Link>
        </div>
      </div>

      {/* Feed Section */}
      <section className="feed-section">
        <div className="feed-header">
          <h2 className="feed-title">🆘 แมวหายล่าสุด</h2>
          <button
            type="button"
            className="feed-refresh-btn"
            onClick={() => fetchCats(true)}
            disabled={refreshing}
          >
            {refreshing ? '⏳' : '🔄'}
          </button>
        </div>

        {loading && (
          <div className="cat-grid">
            {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
          </div>
        )}

        {error && (
          <div className="feed-empty">
            <span>😿</span>
            <p>{error}</p>
            <button type="button" className="meow-btn meow-btn-outline" onClick={() => fetchCats()}>
              ลองใหม่
            </button>
          </div>
        )}

        {!loading && !error && cats.length === 0 && (
          <div className="feed-empty">
            <span>🎉</span>
            <p>ตอนนี้ไม่มีแมวหาย — ดีมากเลย!</p>
            <Link to="/owner/register" className="meow-btn meow-btn-primary" style={{ textDecoration: 'none', marginTop: 12 }}>
              + ลงทะเบียนแมวของคุณ
            </Link>
          </div>
        )}

        {!loading && !error && cats.length > 0 && (
          <div className="cat-grid">
            {cats.map((item) => (
              <CatCard key={item.report_id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Access */}
      <section className="quick-links">
        <Link to="/owner/sos" className="quick-link-card ql-sos">
          <span className="ql-icon">🆘</span>
          <span>SOS แมวหาย</span>
        </Link>
        <Link to="/owner/track" className="quick-link-card ql-track">
          <span className="ql-icon">📡</span>
          <span>ติดตาม</span>
        </Link>
        <Link to="/db-test" className="quick-link-card ql-dev">
          <span className="ql-icon">🛠️</span>
          <span>Dev Test</span>
        </Link>
      </section>

      <p className="meow-footer-note">เปิดบนมือถือได้ทันที ไม่ต้องโหลดแอป</p>
    </MobileShell>
  )
}
