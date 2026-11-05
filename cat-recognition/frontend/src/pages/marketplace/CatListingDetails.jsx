import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css'

export default function CatListingDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cat, setCat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderType, setOrderType] = useState(null) // 'buy' | 'reserve'

  useEffect(() => {
    const fetchCat = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/cats/${id}`)
        if (res.ok) {
          const data = await res.json()
          setCat(data)
        }
      } catch (err) {
        console.error("Failed to fetch cat details:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchCat()
  }, [id])

  const handleAction = (type) => {
    setOrderType(type)
    setShowOrderModal(true)
  }

  if (loading) {
    return <MobileShell title="กำลังโหลด..."><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></MobileShell>
  }

  if (!cat) {
    return <MobileShell title="ไม่พบข้อมูล"><div style={{ padding: '20px', textAlign: 'center' }}>ไม่พบข้อมูลแมวตัวนี้</div></MobileShell>
  }

  const isAvailable = cat.status === 'available'

  return (
    <MobileShell title={(!cat.category || cat.category === 'cat') ? "Cat Passport & Listing" : "รายละเอียดสินค้า"} onBack={() => navigate('/')}>
      <div style={{ paddingBottom: '100px' }}>

        {/* Cat Image Cover */}
        <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#f0f0f0', position: 'relative' }}>
          {cat.image_url ? (
            <img src={`http://localhost:8000${cat.image_url}`} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🐱</div>
          )}
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 12px', borderRadius: '12px', backdropFilter: 'blur(4px)', fontWeight: 'bold' }}>
            {isAvailable ? '🟢 ว่าง' : '🔴 ขายแล้ว'}
          </div>
        </div>

        <div style={{ padding: '16px' }}>

          {/* Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', color: 'var(--meow-text)' }}>{cat.name}</h1>
              <p style={{ margin: 0, color: 'var(--meow-muted)', fontSize: '0.9rem' }}>
                {cat.category === 'food' ? '🍖 อาหาร' : cat.category === 'accessory' ? '🧸 อุปกรณ์' : cat.category === 'clinic' ? '🏥 คอร์สคลินิก' : '🐱 แมว'}
                {(!cat.category || cat.category === 'cat') && ` · ${cat.breed || 'ไม่ระบุ'} · ${cat.color || 'ไม่ระบุ'}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--meow-orange-deep)' }}>
                {cat.price > 0 ? `฿${cat.price.toLocaleString()}` : 'ฟรี'}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--meow-muted)' }}>📍 {cat.location}</p>
            </div>
          </div>

          {/* Core Attributes Pills (Show only for Cats) */}
          {(!cat.category || cat.category === 'cat') && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span className="pill">เพศ: {cat.gender === 'male' ? 'ผู้ ♂️' : cat.gender === 'female' ? 'เมีย ♀️' : 'ไม่ระบุ'}</span>
              <span className="pill">อายุ: {cat.estimated_age || 'ไม่ระบุ'}</span>
              {cat.weight ? <span className="pill">น้ำหนัก: {cat.weight} กก.</span> : null}
            </div>
          )}

          {/* ── Seller Contact Card ── */}
          <div className="meow-card" style={{ marginBottom: '20px', padding: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              {/* Avatar */}
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--meow-purple-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0
              }}>👤</div>

              {/* Name + rating */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  margin: '0 0 2px',
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {cat.seller?.name || 'ผู้ขายไม่ระบุชื่อ'}
                </h4>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                }}>
                  <span style={{ color: '#ffc107' }}>★★★★☆</span>
                  <span style={{ color: 'var(--meow-muted)' }}>4.2 (28 รีวิว)</span>
                </div>
              </div>

              {/* Chat button - แก้ไขแล้ว */}
              <button
                className="meow-btn meow-btn-primary"
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  width: 'auto',
                  minWidth: 'fit-content',
                  background: 'var(--meow-purple)',  /* ← สีเดียว ไม่ใช้ gradient ยาว */
                  border: 'none',
                  color: '#fff',
                  position: 'relative',       /* ← ไม่ให้ล้นออกนอก */
                  overflow: 'hidden'
                }}
                onClick={() => navigate(`/chat/${cat.id}`)}
              >
                💬 แชทหาร้าน
              </button>
            </div>
          </div>
          {/* ── end Seller Contact Card ── */}

          {/* Description */}
          {cat.description && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>รายละเอียด</h3>
              <p style={{ color: 'var(--meow-text)', lineHeight: '1.5', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>{cat.description}</p>
            </div>
          )}

          {/* Digital Passport */}
          {(!cat.category || cat.category === 'cat') && (
            <div className="meow-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', border: '1px solid #dee2e6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--meow-purple-deep)' }}>📘 Cat Passport</h3>
                <span style={{ fontSize: '1.5rem' }}>🩺</span>
              </div>

              {cat.vaccines && cat.vaccines.length > 0 ? (
                <ul style={{ paddingLeft: '20px', margin: 0, color: '#495057', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {cat.vaccines.map(v => (
                    <li key={v.id} style={{ marginBottom: '8px' }}>
                      <strong>{v.name}</strong><br />
                      <span style={{ fontSize: '0.85rem', color: 'var(--meow-purple)' }}>{v.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d', fontStyle: 'italic' }}>ยังไม่มีประวัติวัคซีน</p>
              )}

            </div>
          )}

          {(!cat.category || cat.category === 'cat') && (
            <button
              className="meow-btn meow-btn-outline"
              style={{ width: '100%', padding: '12px' }}
              onClick={() => navigate('/search')}
            >
              🔍 ค้นหาแมวหน้าตาแบบนี้
            </button>
          )}

        </div>
      </div>

      {/* ── Fixed Bottom Action Bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTop: '1px solid #f0eaf8',
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        zIndex: 90,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.07)'
      }}>
        <button
          disabled={!isAvailable}
          onClick={() => handleAction('reserve')}
          style={{
            padding: '14px 0',
            borderRadius: '14px',
            fontSize: '1rem',
            fontWeight: '700',
            border: '2px solid var(--meow-purple, #b57bee)',
            background: 'transparent',
            color: 'var(--meow-purple, #b57bee)',
            cursor: isAvailable ? 'pointer' : 'not-allowed',
            opacity: isAvailable ? 1 : 0.45
          }}
        >
          🔖 จอง
        </button>
        <button
          disabled={!isAvailable}
          onClick={() => handleAction('buy')}
          style={{
            padding: '14px 0',
            borderRadius: '14px',
            fontSize: '1rem',
            fontWeight: '700',
            border: 'none',
            background: 'linear-gradient(135deg, var(--meow-purple, #b57bee), var(--meow-orange-deep, #f07040))',
            color: '#fff',
            cursor: isAvailable ? 'pointer' : 'not-allowed',
            opacity: isAvailable ? 1 : 0.45
          }}
        >
          🛒 สั่งซื้อ
        </button>
      </div>

      {/* ── Order / Reserve Modal ── */}
      {showOrderModal && (
        <div
          onClick={() => setShowOrderModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
            zIndex: 999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '24px 20px 40px',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.12)'
            }}
          >
            {/* Handle bar */}
            <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '2px', margin: '0 auto 20px' }} />

            <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', textAlign: 'center' }}>
              {orderType === 'buy' ? '🛒 สั่งซื้อสินค้า' : '🔖 จองสินค้า'}
            </h2>
            <p style={{ margin: '0 0 20px', textAlign: 'center', color: 'var(--meow-muted)', fontSize: '0.9rem' }}>
              {cat.name} {(!cat.category || cat.category === 'cat') && `· ${cat.breed}`}
            </p>

            {/* Summary box */}
            <div style={{
              background: '#faf7ff',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              border: '1px solid #ede5ff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--meow-muted)' }}>ราคา</span>
                <span style={{ fontWeight: '700', color: 'var(--meow-orange-deep)' }}>
                  {cat.price > 0 ? `฿${cat.price.toLocaleString()}` : 'ฟรี'}
                </span>
              </div>
              {orderType === 'reserve' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--meow-muted)' }}>มัดจำ (10%)</span>
                  <span style={{ fontWeight: '700', color: 'var(--meow-purple)' }}>
                    ฿{Math.round(cat.price * 0.1).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--meow-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              {orderType === 'buy'
                ? 'ระบบจะพาคุณไปที่หน้าชำระเงินผ่านแอป พร้อมใส่โค้ดส่วนลด'
                : 'ชำระค่ามัดจำผ่านแอปเพื่อยืนยันการจองสิทธิ์'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="meow-btn meow-btn-outline"
                style={{ padding: '13px 0', borderRadius: '14px', fontSize: '0.95rem' }}
                onClick={() => setShowOrderModal(false)}
              >
                ยกเลิก
              </button>
              <button
                className="meow-btn meow-btn-primary"
                style={{ padding: '13px 0', borderRadius: '14px', fontSize: '0.95rem', fontWeight: '700' }}
                onClick={() => {
                  setShowOrderModal(false)
                  navigate('/checkout', { 
                    state: { 
                      itemType: cat.category || 'cat', 
                      itemDetails: cat, 
                      isDeposit: orderType === 'reserve' 
                    } 
                  })
                }}
              >
                {orderType === 'buy' ? 'ไปที่หน้าชำระเงิน' : 'ชำระค่ามัดจำ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  )
}