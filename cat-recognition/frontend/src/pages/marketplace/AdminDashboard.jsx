import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  const [data, setData] = useState({ users: [], cats: [], orders: [] })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const [usersRes, catsRes, ordersRes] = await Promise.all([
        fetch('http://localhost:8000/api/admin/users'),
        fetch('http://localhost:8000/api/cats'),
        fetch('http://localhost:8000/api/admin/orders')
      ])

      const users = usersRes.ok ? await usersRes.json() : []
      const catsData = catsRes.ok ? await catsRes.json() : { results: [] }
      const orders = ordersRes.ok ? await ordersRes.json() : []

      setData({
        users: users.results || [],
        cats: catsData.results || [],
        orders: orders.results || []
      })
    } catch (err) {
      console.error('Failed to fetch admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (type, id) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล ID: ${id}? (การกระทำนี้ย้อนกลับไม่ได้)`)) return

    try {
      const res = await fetch(`http://localhost:8000/api/admin/${type}/${id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        throw new Error('การลบล้มเหลว')
      }
      
      alert('ลบข้อมูลสำเร็จ')
      fetchAdminData()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <MobileShell title="Admin Dashboard" onBack={() => navigate(-1)} noNav>
      <div style={{ padding: '16px' }}>
        
        {/* Tabs */}
        <div className="meow-tabs" style={{ marginBottom: '16px' }}>
          <button 
            className={`meow-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 ผู้ใช้ ({data.users.length})
          </button>
          <button 
            className={`meow-tab ${activeTab === 'cats' ? 'active' : ''}`}
            onClick={() => setActiveTab('cats')}
          >
            📦 สินค้า ({data.cats.length})
          </button>
          <button 
            className={`meow-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            🧾 ออเดอร์ ({data.orders.length})
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', marginTop: '40px' }}>กำลังโหลดข้อมูล...</p>
        ) : (
          <div>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.users.length === 0 ? <p>ไม่มีผู้ใช้</p> : data.users.map(u => (
                  <div key={u.id} className="meow-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                    <div>
                      <strong>{u.name}</strong> <span style={{ fontSize: '0.8rem', color: '#666' }}>(ID: {u.id})</span>
                      <div style={{ fontSize: '0.85rem' }}>บทบาท: {u.role} | {u.email}</div>
                    </div>
                    <button onClick={() => handleDelete('users', u.id)} style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Cats/Products Tab */}
            {activeTab === 'cats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.cats.length === 0 ? <p>ไม่มีสินค้า</p> : data.cats.map(c => (
                  <div key={c.id} className="meow-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                    <div>
                      <strong>{c.name}</strong> <span style={{ fontSize: '0.8rem', color: '#666' }}>(ID: {c.id})</span>
                      <div style={{ fontSize: '0.85rem' }}>หมวดหมู่: {c.category || 'cat'} | ราคา: ฿{c.price}</div>
                    </div>
                    <button onClick={() => handleDelete('cats', c.id)} style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.orders.length === 0 ? <p>ไม่มีออเดอร์</p> : data.orders.map(o => (
                  <div key={o.id} className="meow-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                    <div>
                      <strong>ออเดอร์ #{o.id}</strong> <span style={{ fontSize: '0.8rem', color: '#666' }}>({o.status})</span>
                      <div style={{ fontSize: '0.85rem' }}>ประเภท: {o.type} | ยอด: ฿{o.net_amount}</div>
                    </div>
                    <button onClick={() => handleDelete('orders', o.id)} style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </MobileShell>
  )
}
