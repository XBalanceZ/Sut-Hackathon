import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'
import './marketplace.css'

export default function SellerDashboard() {
  const [myCats, setMyCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, available, sold
  const navigate = useNavigate()

  useEffect(() => {
    const fetchMyCats = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        let fetchedCats = []
        const res = await fetch('http://localhost:8000/api/my-cats', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          fetchedCats = data.results || []
        } else {
          const fallback = await fetch('http://localhost:8000/api/cats')
          if (fallback.ok) {
            const data = await fallback.json()
            fetchedCats = data.results || []
          }
        }
        
        const savedClinics = JSON.parse(localStorage.getItem('clinicCourses') || '[]')
        const mappedClinics = savedClinics.map(c => ({
          ...c,
          category: 'clinic',
          status: 'available',
        }))
        
        setMyCats([...mappedClinics, ...fetchedCats])
        
      } catch (err) {
        console.error("Failed to fetch cats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMyCats()
  }, [])

  const handleDeleteCat = async (cat) => {
    if (!window.confirm(`ต้องการลบ "${cat.name}" ออกจากร้านใช่ไหม?`)) return

    if (String(cat.id).startsWith('local-clinic-')) {
      const savedClinics = JSON.parse(localStorage.getItem('clinicCourses') || '[]')
      const newClinics = savedClinics.filter(c => c.id !== cat.id)
      localStorage.setItem('clinicCourses', JSON.stringify(newClinics))
      setMyCats(prev => prev.filter(item => item.id !== cat.id))
      return
    }

    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(`http://localhost:8000/api/cats/${cat.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'ลบสินค้าไม่สำเร็จ')
      }
      setMyCats(prev => prev.filter(item => item.id !== cat.id))
    } catch (err) {
      alert(err.message || 'ลบสินค้าไม่สำเร็จ')
    }
  }

  return (
    <MobileShell title="หน้าร้านของฉัน" hideHeaderIcon>
      <div className="marketplace-container">
        
        {/* Sales Summary Section */}
        <div 
          className="meow-card" 
          style={{ marginBottom: '16px', padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => navigate('/sales')}
        >
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: 'var(--meow-muted)' }}>ยอดขายสัปดาห์นี้</h3>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--meow-purple-deep)' }}>฿20,100</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ padding: '4px 8px', background: '#e6f4ea', color: '#137333', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block', marginBottom: '4px' }}>
              +14% 📈
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--meow-purple)', fontWeight: 'bold' }}>ดูรายละเอียด &gt;</div>
          </div>
        </div>
        
        <div className="meow-card" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, var(--meow-orange), var(--meow-orange-deep))', color: '#fff', border: 'none' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>🏪 เพิ่มสินค้าใหม่</h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.9rem', opacity: 0.9 }}>เลือกลงขายแมว อาหาร อุปกรณ์ หรือคอร์สคลินิก</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button 
              onClick={() => navigate('/sell', { state: { category: 'cat' } })}
              style={{ padding: '12px 8px', background: '#fff', color: 'var(--meow-orange-deep)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <span style={{ fontSize: '1.5rem' }}>🐱</span>
              แมว
            </button>
            <button 
              onClick={() => navigate('/sell', { state: { category: 'food' } })}
              style={{ padding: '12px 8px', background: '#fff', color: 'var(--meow-orange-deep)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <span style={{ fontSize: '1.5rem' }}>🍖</span>
              อาหาร
            </button>
            <button 
              onClick={() => navigate('/sell', { state: { category: 'accessory' } })}
              style={{ padding: '12px 8px', background: '#fff', color: 'var(--meow-orange-deep)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <span style={{ fontSize: '1.5rem' }}>🧸</span>
              อุปกรณ์
            </button>
            <button 
              onClick={() => navigate('/sell', { state: { category: 'clinic' } })}
              style={{ padding: '12px 8px', background: '#fff', color: 'var(--meow-orange-deep)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <span style={{ fontSize: '1.5rem' }}>🏥</span>
              คลินิก
            </button>
          </div>
        </div>

        {/* Shop and Shelter Management Section */}
        <h3 style={{ fontSize: '1.1rem', margin: '20px 0 12px' }}>⚙️ จัดการร้านและที่พัก</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '0 12px 20px' }}>
          <button 
            className="meow-card" 
            style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', cursor: 'pointer', border: '1px solid var(--meow-border)' }}
            onClick={() => alert('เปิดหน้าตั้งค่าโปรไฟล์ร้านค้า (กำลังพัฒนา)')}
          >
            <span style={{ fontSize: '2rem' }}>🏪</span>
            <strong style={{ fontSize: '0.9rem' }}>จัดการร้าน</strong>
          </button>

          <button 
            className="meow-card" 
            style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', cursor: 'pointer', border: '1px solid var(--meow-border)' }}
            onClick={() => navigate('/manage-shelter')}
          >
            <span style={{ fontSize: '2rem' }}>🏨</span>
            <strong style={{ fontSize: '0.9rem' }}>จัดการที่พัก</strong>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingLeft: '12px' }}>รายการสินค้าที่ลงขายแล้ว ({myCats.length})</h3>
        </div>

        {/* Filter Tabs */}
        <div className="meow-tabs" style={{ margin: '0 0 16px 0', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '8px' }}>
          <button 
            className={`meow-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            ทั้งหมด
          </button>
          <button 
            className={`meow-tab ${filter === 'cat' ? 'active' : ''}`}
            onClick={() => setFilter('cat')}
          >
            🐱 แมว
          </button>
          <button 
            className={`meow-tab ${filter === 'food' ? 'active' : ''}`}
            onClick={() => setFilter('food')}
          >
            🍖 อาหาร
          </button>
          <button 
            className={`meow-tab ${filter === 'accessory' ? 'active' : ''}`}
            onClick={() => setFilter('accessory')}
          >
            🧸 อุปกรณ์
          </button>
          <button 
            className={`meow-tab ${filter === 'clinic' ? 'active' : ''}`}
            onClick={() => setFilter('clinic')}
          >
            🏥 คลินิก
          </button>
        </div>

        <div className="cat-grid">
          {loading ? (
            <p className="loading-text">กำลังโหลด...</p>
          ) : myCats.filter(c => filter === 'all' || (c.category || 'cat') === filter).length === 0 ? (
            <p className="empty-state">ไม่มีสินค้าในหมวดหมู่นี้ 😿</p>
          ) : (
            myCats.filter(c => filter === 'all' || (c.category || 'cat') === filter).map((cat) => (
              <div key={cat.id} className="cat-card">
                <div className="cat-image-wrapper">
                  {cat.image_url ? (
                    <img src={`http://localhost:8000${cat.image_url}`} alt={cat.name} className="cat-image" />
                  ) : (
                    <div className="cat-image-placeholder">
                      {cat.category === 'food' ? '🍖' : cat.category === 'accessory' ? '🧸' : cat.category === 'clinic' ? '🏥' : '🐱'}
                    </div>
                  )}
                  <div className="cat-price-badge" style={{ background: cat.status === 'available' ? 'var(--meow-white)' : '#ffeaea', color: cat.status === 'available' ? 'var(--meow-orange-deep)' : '#ff4d4f' }}>
                    {cat.status === 'available' ? `฿${cat.price.toLocaleString()}` : 'ขายแล้ว'}
                  </div>
                </div>
                <div className="cat-info">
                  <h3 className="cat-name">{cat.name}</h3>
                  <div className="cat-meta" style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Link to={`/edit-cat/${cat.id}`} style={{ textDecoration: 'none', color: 'var(--meow-purple)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        ✏️ แก้ไขข้อมูลสินค้า
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteCat(cat)}
                        style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--meow-danger)', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        🗑️ ลบสินค้า
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
      <BottomNav />
    </MobileShell>
  )
}
