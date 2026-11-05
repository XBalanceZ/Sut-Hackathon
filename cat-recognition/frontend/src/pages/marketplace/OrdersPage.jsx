import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'

const HIDDEN_ORDERS_KEY = 'hiddenOrderHistoryIds'

const getOrderStorageId = (order) => String(order.raw_id || order.rawId || order.order_id || order.id)

const getHiddenOrderIds = () => {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_ORDERS_KEY) || '[]')
  } catch {
    return []
  }
}

const getSellerRating = (orderId) => {
  const idText = String(orderId || '')
  const scoreSeed = [...idText].reduce((total, char) => total + char.charCodeAt(0), 0)
  return 4 + (scoreSeed % 2)
}

function StarRating({ rating, onRate, size = '1.5rem', readonly = false }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => !readonly && onRate && onRate(star)}
          style={{
            fontSize: size,
            cursor: readonly ? 'default' : 'pointer',
            color: star <= rating ? '#ffc107' : '#dee2e6',
            transition: 'transform 0.15s',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [reviews, setReviews] = useState({})
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [swipeOffsets, setSwipeOffsets] = useState({})
  const swipeRef = useRef({})
  
  // State สำหรับควบคุม Modal เตือนการยกเลิกการจอง
  const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null, rawId: null })

  const role = localStorage.getItem('mockRole') || 'buyer'
  
  useEffect(() => {
    const fetchOrders = async () => {
      const mockOrders = JSON.parse(localStorage.getItem('mockOrders') || '[]')
      const hiddenIds = new Set(getHiddenOrderIds())
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch('http://localhost:8000/api/orders', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        if (res.ok) {
          const data = await res.json()
          setOrders([...mockOrders, ...(data.results || [])].filter(order => !hiddenIds.has(getOrderStorageId(order))))
        } else {
          setOrders(mockOrders.filter(order => !hiddenIds.has(getOrderStorageId(order))))
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err)
        setOrders(mockOrders.filter(order => !hiddenIds.has(getOrderStorageId(order))))
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const filteredOrders = orders
    .filter(o => filter === 'all' || o.status === filter)
    .sort((a, b) => {
      if (a.created_at_iso && b.created_at_iso) {
        return new Date(b.created_at_iso) - new Date(a.created_at_iso)
      }
      return String(b.id).localeCompare(String(a.id))
    })

  const handleRatingChange = (orderId, rating) => {
    setReviews(prev => ({ ...prev, [orderId]: { ...prev[orderId], rating, submitted: false } }))
  }

  const handleCommentChange = (orderId, comment) => {
    setReviews(prev => ({ ...prev, [orderId]: { ...prev[orderId], comment, submitted: false } }))
  }

  const handleSubmitReview = (orderId) => {
    setReviews(prev => ({ ...prev, [orderId]: { ...prev[orderId], submitted: true } }))
  }

  const updateOrderStatus = (targetOrder, status) => {
    const targetId = getOrderStorageId(targetOrder)

    setOrders(prev => prev.map(order => (
      getOrderStorageId(order) === targetId ? { ...order, status } : order
    )))

    const mockOrders = JSON.parse(localStorage.getItem('mockOrders') || '[]')
    const nextMockOrders = mockOrders.map(order => (
      getOrderStorageId(order) === targetId ? { ...order, status } : order
    ))
    localStorage.setItem('mockOrders', JSON.stringify(nextMockOrders))
  }

  const confirmReceiveOrder = async (order) => {
    if (!window.confirm('ยืนยันว่าได้รับสินค้า/บริการเรียบร้อยแล้วใช่ไหม?')) return

    const token = localStorage.getItem('access_token')
    const rawId = order.raw_id || order.rawId || order.order_id || null

    try {
      if (rawId && token) {
        const res = await fetch(`http://localhost:8000/api/orders/${rawId}/release`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          if (!(res.status === 404 && err.detail === 'Order not found')) {
            throw new Error(err.detail || 'ไม่สามารถยืนยันรับได้')
          }
        }
      }

      updateOrderStatus(order, 'completed')
    } catch (err) {
      alert(err.message || 'ไม่สามารถยืนยันรับได้')
    }
  }

  const hideOrderHistory = (order) => {
    const storageId = getOrderStorageId(order)
    const hiddenIds = new Set(getHiddenOrderIds())
    hiddenIds.add(storageId)
    localStorage.setItem(HIDDEN_ORDERS_KEY, JSON.stringify([...hiddenIds]))
    setOrders(prev => prev.filter(item => getOrderStorageId(item) !== storageId))
    setSwipeOffsets(prev => {
      const next = { ...prev }
      delete next[order.id]
      return next
    })
  }

  const handleSwipeStart = (orderId, clientX) => {
    swipeRef.current[orderId] = { startX: clientX, deltaX: 0 }
  }

  const handleSwipeMove = (orderId, clientX) => {
    const swipe = swipeRef.current[orderId]
    if (!swipe) return

    const deltaX = Math.max(0, Math.min(120, clientX - swipe.startX))
    swipe.deltaX = deltaX
    setSwipeOffsets(prev => ({ ...prev, [orderId]: deltaX }))
  }

  const handleSwipeEnd = (order) => {
    const swipe = swipeRef.current[order.id]
    delete swipeRef.current[order.id]

    if (swipe?.deltaX > 80) {
      hideOrderHistory(order)
    } else {
      setSwipeOffsets(prev => ({ ...prev, [order.id]: 0 }))
    }
  }

  // เปิดหน้าต่างเตือนยกเลิก
  const openCancelModal = (order) => {
    setCancelModal({ isOpen: true, orderId: order.id, rawId: order.raw_id || order.rawId || order.order_id || null })
  }

  // ยืนยันการยกเลิก (และยอมรับความเสี่ยงเรื่องไม่คืนเงิน)
  const confirmCancelOrder = async () => {
    const token = localStorage.getItem('access_token')

    try {
      if (cancelModal.rawId && token) {
        const res = await fetch(`http://localhost:8000/api/orders/${cancelModal.rawId}/cancel`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          // ถ้าเป็นออเดอร์จำลอง (Mock) ที่ไม่มีในฐานข้อมูล ให้ข้าม Error นี้ไปเพื่อให้ลบในหน้าจอได้
          if (!(res.status === 404 && err.detail === 'Order not found')) {
            throw new Error(err.detail || 'ไม่สามารถยกเลิกคำสั่งซื้อได้')
          }
        }
      }

      setOrders(prev => prev.map(order => (
        order.id === cancelModal.orderId ? { ...order, status: 'cancelled' } : order
      )))
      setCancelModal({ isOpen: false, orderId: null, rawId: null })
    } catch (err) {
      alert(err.message || 'ไม่สามารถยกเลิกคำสั่งซื้อได้')
    }
  }

  return (
    <MobileShell title="ประวัติออเดอร์" hideHeaderIcon>
      <div style={{ padding: '16px', paddingBottom: '90px' }}>
        
        {/* Tabs */}
        <div className="meow-tabs" style={{ margin: '0 0 16px 0' }}>
          <button className={`meow-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            ทั้งหมด
          </button>
          <button className={`meow-tab ${filter === 'holding' ? 'active' : ''}`} onClick={() => setFilter('holding')}>
            รอรับแมว/เงินพักไว้
          </button>
          <button className={`meow-tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
            สำเร็จแล้ว
          </button>
          <button className={`meow-tab ${filter === 'cancelled' ? 'active' : ''}`} onClick={() => setFilter('cancelled')}>
            ยกเลิก
          </button>
        </div>

        {/* Order List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--meow-muted)' }}>
              <p>กำลังโหลด...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--meow-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
              <p>ไม่มีรายการออเดอร์ในสถานะนี้</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const price = Number(order.price) || 0
              const fee = Number(order.fee) || 0

              return (
              <div
                key={order.id}
                style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--meow-radius)' }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingLeft: '18px',
                  background: '#dc3545',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }}>
                  🗑️ ลบประวัติ
                </div>
                <div
                  className="meow-card"
                  onPointerDown={(e) => handleSwipeStart(order.id, e.clientX)}
                  onPointerMove={(e) => handleSwipeMove(order.id, e.clientX)}
                  onPointerUp={() => handleSwipeEnd(order)}
                  onPointerCancel={() => handleSwipeEnd(order)}
                  style={{
                    margin: 0,
                    padding: '16px',
                    position: 'relative',
                    touchAction: 'pan-y',
                    transform: `translateX(${swipeOffsets[order.id] || 0}px)`,
                    transition: swipeOffsets[order.id] ? 'none' : 'transform 0.18s ease',
                    userSelect: 'none',
                  }}
                >
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed #e9ecef', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--meow-muted)', fontWeight: '600' }}>#{order.id}</span>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(order.status === 'completed' || order.status === 'cancelled') && (
                      <button 
                        onClick={() => hideOrderHistory(order)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc3545', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        🗑️ ซ่อน
                      </button>
                    )}
                    {order.status === 'holding' ? (
                      <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', background: '#fff3cd', color: '#856404', fontWeight: 'bold' }}>
                        🛡️ รอผู้ซื้อยืนยันรับ
                      </span>
                    ) : order.status === 'cancelled' ? (
                      <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', background: '#ffeaea', color: '#dc3545', fontWeight: 'bold' }}>
                        ❌ ยกเลิกแล้ว
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', background: '#d4edda', color: '#155724', fontWeight: 'bold' }}>
                        ✅ สำเร็จแล้ว
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  {order.image ? (
                    <img src={order.image} alt="item" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'var(--meow-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      {order.type === 'clinic' ? '🏥' : order.type === 'hotel' ? '🏨' : '🐱'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--meow-text)' }}>{order.item || 'ไม่มีข้อมูล'}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--meow-muted)' }}>
                      {role === 'seller' ? 'ผู้ซื้อ: ' : 'ผู้ขาย: '}
                      <strong style={{ color: 'var(--meow-text)' }}>
                        {role === 'seller' ? order.buyerName || 'Unknown' : order.sellerName || 'Unknown'}
                      </strong>
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--meow-muted)' }}>{order.date}</p>
                  </div>
                </div>

                {/* Price */}
                <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                  {role === 'seller' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--meow-muted)' }}>ยอดขาย</span>
                        <span>฿{price.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#dc3545' }}>
                        <span>หักค่าธรรมเนียม GP ({price > 0 ? ((fee / price) * 100).toFixed(1) : 0}%)</span>
                        <span>-฿{fee.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', borderTop: '1px solid #dee2e6', paddingTop: '8px', color: 'var(--meow-orange-deep)' }}>
                        <span>ยอดสุทธิ</span>
                        <span>฿{(price - fee).toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', color: 'var(--meow-purple-deep)' }}>
                      <span>ยอดชำระสุทธิ</span>
                      <span>฿{price.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Delivery Map UI / Clinic Tag UI */}
                {role === 'buyer' && order.status === 'holding' && (
                  order.type === 'clinic' ? (
                    <div style={{ marginTop: '16px', background: '#f8f9fa', border: '1px dashed var(--meow-purple)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 12px', color: 'var(--meow-purple)' }}>🎟️ e-Coupon / Tag</h4>
                      <div style={{ width: '100px', height: '100px', margin: '0 auto', background: `url("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CLINIC-TAG-${order.tag || order.id}") center/cover` }} />
                      <p style={{ margin: '8px 0 4px', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' }}>{order.tag || 'CLI-123456'}</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--meow-muted)' }}>แสดง Tag นี้ให้พนักงานคลินิก</p>
                    </div>
                  ) : order.type === 'hotel' ? (
                    <div style={{ marginTop: '16px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 8px', color: 'var(--meow-purple-deep)' }}>🏨 รอยืนยันการเข้าพัก</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--meow-muted)' }}>โปรดแสดงหน้านี้เมื่อถึงที่พัก</p>
                    </div>
                  ) : (
                    <div style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e9ecef' }}>
                      <div style={{ height: '120px', background: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80") center/cover', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--meow-orange-deep)' }}>
                          🚚 กำลังจัดส่ง...
                        </div>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--meow-muted)' }}>พนักงานจัดส่ง</span>
                          <strong>Lalamove - สมหมาย รวดเร็ว</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--meow-muted)' }}>คาดว่าจะถึง</span>
                          <strong style={{ color: 'var(--meow-purple)' }}>ภายใน 45 นาที</strong>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* Review Section */}
                {role === 'buyer' && order.status === 'completed' && (
                  <div style={{ marginTop: '16px', background: '#fdf8ff', border: '1px solid #e9d5f5', borderRadius: '12px', padding: '14px' }}>
                    {reviews[order.id]?.submitted ? (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#28a745' }}>✅ ขอบคุณสำหรับรีวิว!</p>
                        <StarRating rating={reviews[order.id]?.rating || 0} readonly size="1.2rem" />
                        {reviews[order.id]?.comment && (
                          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--meow-muted)', fontStyle: 'italic' }}>"{reviews[order.id].comment}"</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: '0.9rem' }}>⭐ ให้คะแนนร้านค้า</p>
                        <StarRating 
                          rating={reviews[order.id]?.rating || 0} 
                          onRate={(r) => handleRatingChange(order.id, r)} 
                        />
                        <textarea 
                          placeholder="เขียนรีวิว (ไม่บังคับ)..."
                          className="meow-input"
                          value={reviews[order.id]?.comment || ''}
                          onChange={(e) => handleCommentChange(order.id, e.target.value)}
                          rows={2}
                          style={{ width: '100%', marginTop: '10px', fontSize: '0.85rem' }}
                        />
                        <button 
                          className="meow-btn meow-btn-primary"
                          onClick={() => handleSubmitReview(order.id)}
                          disabled={!reviews[order.id]?.rating}
                          style={{ 
                            width: '100%', marginTop: '8px', padding: '10px', borderRadius: '10px', fontSize: '0.9rem',
                            opacity: reviews[order.id]?.rating ? 1 : 0.5
                          }}
                        >
                          ส่งรีวิว
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Seller sees ratings */}
                {role === 'seller' && order.status === 'completed' && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#fff8e1', borderRadius: '8px' }}>
                    <StarRating rating={getSellerRating(order.id)} readonly size="1rem" />
                    <span style={{ fontSize: '0.8rem', color: '#856404' }}>คะแนนจากลูกค้า</span>
                  </div>
                )}

                {/* Actions Button Zone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="meow-btn meow-btn-outline" style={{ flex: 1, padding: '10px', fontSize: '0.9rem', borderRadius: '8px' }} onClick={() => navigate('/chat/1')}>
                      💬 {role === 'seller' ? 'ทักแชทลูกค้า' : 'ติดต่อร้านค้า'}
                    </button>
                    {order.status === 'holding' && (
                      <button
                        className="meow-btn meow-btn-primary"
                        onClick={() => role === 'buyer' && confirmReceiveOrder(order)}
                        disabled={role === 'seller'}
                        style={{ flex: 1, padding: '10px', fontSize: '0.9rem', borderRadius: '8px', opacity: role === 'seller' ? 0.6 : 1 }}
                      >
                        {role === 'seller' ? 'รอโอนเงิน...' : 'ยืนยันรับสินค้า'}
                      </button>
                    )}
                  </div>

                  {/* ปุ่มยกเลิกการจอง (แสดงเฉพาะสถานะ holding) */}
                  {order.status === 'holding' && (
                    <button 
                      type="button" 
                      onClick={() => openCancelModal(order)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '0.85rem',
                        color: '#dc3545',
                        background: '#fff5f5',
                        border: '1px solid #fabebf',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ❌ ยกเลิกการจอง
                    </button>
                  )}
                </div>

                </div>
              </div>
              )
            })
          )}
        </div>
      </div>

      {/* --- Modal แจ้งเตือนเรื่องการไม่คืนเงิน --- */}
      {cancelModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '20px',
            maxWidth: '320px', width: '100%', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>⚠️</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#212529' }}>ยืนยันการยกเลิกการจอง?</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#dc3545', fontWeight: 'bold', lineHeight: '1.4' }}>
              โปรดทราบ: หากกดยืนยัน ระบบจะไม่คืนเงินค่ามัดจำหรือเครดิตทุกกรณีตามนโยบายของแพลตฟอร์ม
            </p>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCancelModal({ isOpen: false, orderId: null, rawId: null })}
                style={{
                  flex: 1, padding: '10px', border: '1px solid #ced4da',
                  borderRadius: '8px', backgroundColor: '#fff', fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                กลับไปก่อน
              </button>
              <button 
                onClick={confirmCancelOrder}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  borderRadius: '8px', backgroundColor: '#dc3545', color: '#fff',
                  fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </MobileShell>
  )
}
