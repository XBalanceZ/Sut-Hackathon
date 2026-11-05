import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css'

function getApiErrorMessage(detail) {
  if (!detail) return 'ไม่ทราบสาเหตุ'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map(item => item.msg || item.message || JSON.stringify(item))
      .join(', ')
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail)
  }
  return String(detail)
}

export default function CheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Data passed from previous page
  const { itemType, itemDetails, isDeposit } = location.state || {
    itemType: 'unknown',
    itemDetails: { name: 'ไม่พบรายการ', price: 0 },
    isDeposit: false
  }

  const [nights, setNights] = useState(1)
  const totalPrice = itemType === 'hotel' ? itemDetails.price * nights : itemDetails.price
  const basePrice = isDeposit ? Math.round(totalPrice * 0.1) : totalPrice
  
  const [discountCode, setDiscountCode] = useState('')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountError, setDiscountError] = useState('')
  
  const [paymentMethod, setPaymentMethod] = useState('promptpay')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [showAd, setShowAd] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // Shipping
  const [deliveryMethod, setDeliveryMethod] = useState('pickup') // pickup or shipping
  const shippingFee = deliveryMethod === 'shipping' ? 150 : 0

  const applyDiscount = () => {
    setDiscountError('')
    const code = discountCode.trim().toUpperCase()
    if (!code) return
    
    if (code === 'MEOW50') {
      setDiscountValue(50)
      setDiscountApplied(true)
    } else if (code === 'CATLOVER') {
      setDiscountValue(Math.round(basePrice * 0.1)) // 10% discount
      setDiscountApplied(true)
    } else {
      setDiscountApplied(false)
      setDiscountValue(0)
      setDiscountError('โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว')
    }
  }

  const removeDiscount = () => {
    setDiscountCode('')
    setDiscountValue(0)
    setDiscountApplied(false)
    setDiscountError('')
  }

  const [addMeowCare, setAddMeowCare] = useState(false)
  const meowCarePrice = 1990
  const [orderData, setOrderData] = useState(null)
  const [fallbackReference] = useState(() => Math.floor(Math.random() * 1000000).toString().padStart(6, '0'))

  // 🏥 Check if the offer should be shown (always for cats, but for hotels, only if they have a clinic. Hide for clinic courses)
  const isHotel = itemType === 'hotel'
  const hasClinic = itemDetails.tags?.some(tag => tag.includes('คลินิก'))
  const showMeowCare = itemType === 'clinic' ? false : (isHotel ? hasClinic : true)
  const clinicProgramDetails = {
    clinicName: itemDetails.clinicName || 'คลินิกพาร์ทเนอร์ MeowMatch',
    duration: itemDetails.duration || 'ประมาณ 45-60 นาที',
    validity: itemDetails.validity || 'ใช้สิทธิ์ได้ภายใน 90 วันหลังชำระเงิน',
    included: itemDetails.included || [
      'ตรวจร่างกายทั่วไปโดยสัตวแพทย์',
      'ประเมินน้ำหนัก อุณหภูมิ หัวใจ ปอด ช่องปาก และผิวหนัง',
      'รับคำแนะนำการดูแลสุขภาพตามช่วงวัย',
    ],
    preparation: itemDetails.preparation || [
      'นำสมุดวัคซีนหรือประวัติสุขภาพเดิมมาด้วย',
      'แจ้งโรคประจำตัว ยาที่ใช้อยู่ หรืออาการผิดปกติก่อนรับบริการ',
    ],
    process: itemDetails.process || [
      'แสดงรายการสั่งซื้อกับพนักงานหน้าเคาน์เตอร์',
      'ซักประวัติและตรวจสุขภาพตามโปรแกรม',
      'รับผลตรวจและคำแนะนำจากสัตวแพทย์',
    ],
    terms: itemDetails.terms || [
      'ราคานี้ไม่รวมค่ายาหรือหัตถการเพิ่มเติมนอกแพ็กเกจ',
      'ควรจองเวลาล่วงหน้าก่อนเข้ารับบริการ',
      'ไม่สามารถแลกเป็นเงินสดได้',
    ],
  }

  const finalPrice = Math.max(0, basePrice - discountValue + shippingFee + (addMeowCare && showMeowCare ? meowCarePrice : 0))

  const handlePayment = async () => {
    if (finalPrice <= 0 && basePrice > 0 && !discountApplied) {
      // Just a safety check
    }
    setIsProcessing(true)
    setPaymentError('')
    
    try {
      const token = localStorage.getItem('access_token')
      if (!token || token.startsWith('fake-token-')) {
        setPaymentError('กรุณาเข้าสู่ระบบใหม่เพื่อรับโทเคนจริงก่อนสร้างคำสั่งซื้อ')
        return
      }

      // For demo, if seller_id is missing, default to 1
      const sellerId = itemDetails.owner_id || 1
      
      const parsedCatId = parseInt(itemDetails.id, 10)
      const finalCatId = isNaN(parsedCatId) ? null : parsedCatId

      const payload = {
        cat_id: finalCatId,
        seller_id: sellerId,
        order_type: itemType,
        price: finalPrice,
        discount: discountValue,
        tag: itemType === 'clinic' ? `CLI-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null
      }

      const res = await fetch('http://localhost:8000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const data = await res.json()
        setOrderData(data)
        setPaymentSuccess(true)
        setShowAd(true)
      } else {
        const err = await res.json().catch(() => ({}))
        setPaymentError(`เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ: ${getApiErrorMessage(err.detail)}`)
      }
    } catch {
      setPaymentError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า backend ทำงานอยู่')
    } finally {
      setIsProcessing(false)
    }
  }

  if (paymentSuccess) {
    return (
      <MobileShell title="ชำระเงินสำเร็จ" onBack={() => navigate('/')} noNav>
        {/* Ad Pop-up */}
        {showAd && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '340px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowAd(false)}
                style={{ position: 'absolute', top: '12px', right: '12px', background: '#f1f3f5', border: 'none', width: '32px', height: '32px', borderRadius: '16px', fontWeight: 'bold', color: '#495057', cursor: 'pointer' }}
              >
                ✕
              </button>
              <h3 style={{ margin: '0 0 12px', color: 'var(--meow-orange-deep)' }}>✨ สิทธิพิเศษสำหรับคุณ!</h3>
              <div style={{ background: '#f8f9fa', borderRadius: '12px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '2rem' }}>
                🛒 🐾
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--meow-text)' }}>
                รับส่วนลด 20% สำหรับอาหารแมวเกรดพรีเมียมเมื่อซื้อผ่าน MeowMatch Marketplace ภายใน 24 ชม.!
              </p>
              <button onClick={() => setShowAd(false)} className="meow-btn meow-btn-primary" style={{ width: '100%', borderRadius: '12px', padding: '12px' }}>
                รับสิทธิ์เลย
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: '#d4edda', color: '#28a745', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '20px' }}>
            ✓
          </div>
          <h2 style={{ margin: '0 0 8px' }}>ทำรายการสำเร็จ!</h2>
          <p style={{ color: 'var(--meow-muted)', marginBottom: '32px' }}>
            {itemType === 'cat' 
              ? 'ระบบได้ส่งหลักฐานการโอนเงินให้ผู้ขายแล้ว คุณสามารถแชทเพื่อพูดคุยรายละเอียดนัดรับได้เลย'
              : itemType === 'clinic' ? 'ชำระเงินสำหรับแพ็กเกจสุขภาพเรียบร้อยแล้ว' : 'การจองที่พักของคุณได้รับการยืนยันแล้ว'}
          </p>

          {itemType === 'clinic' && (
            <div style={{ width: '100%', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '1rem', color: 'var(--meow-text)' }}>รายละเอียดโปรแกรมที่ซื้อ</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--meow-muted)' }}>คลินิก</span>
                  <strong style={{ textAlign: 'right' }}>{clinicProgramDetails.clinicName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--meow-muted)' }}>รหัสใช้สิทธิ์</span>
                  <strong>{orderData?.tag || 'CLI-123456'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--meow-muted)' }}>อายุคูปอง</span>
                  <strong style={{ textAlign: 'right' }}>{clinicProgramDetails.validity}</strong>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: '#f8f9fa', width: '100%', padding: '16px', borderRadius: '12px', marginBottom: '32px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>หมายเลขอ้างอิง: <strong>#{orderData ? `ORD-${orderData.order_id.toString().padStart(6, '0')}` : fallbackReference}</strong></p>
            <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>ยอดชำระ: <strong>฿{finalPrice.toLocaleString()}</strong></p>
          </div>
          <button className="meow-btn meow-btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '14px' }} onClick={() => navigate('/orders')}>
            ดูคำสั่งซื้อของฉัน
          </button>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell title="ชำระเงิน" onBack={() => navigate(-1)} noNav>
      <div style={{ padding: '16px', paddingBottom: '100px' }}>
        
        {/* Order Summary */}
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>📝 สรุปคำสั่งซื้อ</h3>
        <div className="meow-card" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
            {itemDetails.image_url ? (
              <img src={itemDetails.image_url.startsWith('http') ? itemDetails.image_url : `http://localhost:8000${itemDetails.image_url}`} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'var(--meow-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                {itemType === 'hotel' ? '🏨' : itemType === 'clinic' ? '🏥' : '🐱'}
              </div>
            )}
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{itemDetails.name}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--meow-muted)' }}>
                {isDeposit ? 'ชำระค่ามัดจำ (10%)' : (itemType === 'hotel' ? 'ชำระค่าจองที่พัก' : itemType === 'clinic' ? 'ชำระค่าแพ็กเกจคลินิก' : 'ชำระเต็มจำนวน')}
              </p>
              {itemType === 'clinic' && itemDetails.tags && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {itemDetails.tags.map(tag => (
                    <span key={tag} style={{ background: '#eaf2f8', color: '#2980b9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {itemType === 'clinic' && (
            <div style={{ marginBottom: '16px', background: '#f7fbff', border: '1px solid #d9ecff', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--meow-muted)' }}>คลินิก</span>
                  <strong style={{ textAlign: 'right' }}>{clinicProgramDetails.clinicName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--meow-muted)' }}>ระยะเวลา</span>
                  <strong style={{ textAlign: 'right' }}>{clinicProgramDetails.duration}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--meow-muted)' }}>อายุแพ็กเกจ</span>
                  <strong style={{ textAlign: 'right' }}>{clinicProgramDetails.validity}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#1f6f9f' }}>รายการที่รวมในโปรแกรม</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#34495e', fontSize: '0.86rem', lineHeight: 1.55 }}>
                    {clinicProgramDetails.included.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#1f6f9f' }}>ขั้นตอนเข้ารับบริการ</h4>
                  <ol style={{ margin: 0, paddingLeft: '18px', color: '#34495e', fontSize: '0.86rem', lineHeight: 1.55 }}>
                    {clinicProgramDetails.process.map(item => <li key={item}>{item}</li>)}
                  </ol>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#1f6f9f' }}>การเตรียมตัวก่อนใช้บริการ</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#34495e', fontSize: '0.86rem', lineHeight: 1.55 }}>
                    {clinicProgramDetails.preparation.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#1f6f9f' }}>เงื่อนไขสำคัญ</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#34495e', fontSize: '0.86rem', lineHeight: 1.55 }}>
                    {clinicProgramDetails.terms.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {itemType === 'hotel' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#f8f9fa', padding: '12px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>จำนวนคืน</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => setNights(Math.max(1, nights - 1))}
                  style={{ width: '30px', height: '30px', borderRadius: '15px', border: '1px solid var(--meow-border)', background: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  -
                </button>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '20px', textAlign: 'center' }}>{nights}</span>
                <button 
                  onClick={() => setNights(nights + 1)}
                  style={{ width: '30px', height: '30px', borderRadius: '15px', border: 'none', background: 'var(--meow-purple-soft)', color: 'var(--meow-purple-deep)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
            <span style={{ color: '#495057' }}>ราคา</span>
            <span>฿{basePrice.toLocaleString()}</span>
          </div>
          
          {discountApplied && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', color: '#28a745' }}>
              <span>ส่วนลด</span>
              <span>-฿{discountValue.toLocaleString()}</span>
            </div>
          )}
          
          {shippingFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', color: '#495057' }}>
              <span>🚚 ค่าจัดส่ง</span>
              <span>฿{shippingFee.toLocaleString()}</span>
            </div>
          )}
          
          {addMeowCare && showMeowCare && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', color: 'var(--meow-orange-deep)' }}>
              <span>แพ็กเกจ MeowCare+</span>
              <span>+฿{meowCarePrice.toLocaleString()}</span>
            </div>
          )}
          
          <div style={{ height: '1px', background: '#dee2e6', margin: '12px 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <span>ยอดสุทธิ</span>
            <span style={{ color: 'var(--meow-orange-deep)' }}>฿{finalPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* MeowCare+ Premium Upsell */}
        {showMeowCare && (
          <>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--meow-orange-deep)', fontWeight: '800' }}>ข้อเสนอพิเศษ</span>
            </h3>
            <div className="meow-card" style={{ padding: '0', marginBottom: '20px', border: '1px solid rgba(255,122,69,0.3)', overflow: 'hidden' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', padding: '16px', cursor: 'pointer', background: addMeowCare ? '#fff0eb' : '#fff' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.05rem', color: '#333' }}>
                    <span style={{ background: 'linear-gradient(135deg, var(--meow-orange), var(--meow-orange-deep))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MeowCare+ Premium</span> 
                    <span style={{ fontSize: '0.75rem', background: 'var(--meow-orange-deep)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>รายปี</span>
                  </strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: '#555', lineHeight: '1.6' }}>
                    <li>ตรวจสุขภาพฟรี 3 ครั้ง</li>
                    <li>วัคซีนพื้นฐานฟรี 1 ปี</li>
                    <li>ส่วนลดอาหารแมว 15%</li>
                    <li>ปรึกษาสัตว์แพทย์ออนไลน์</li>
                  </ul>
                  <div style={{ marginTop: '8px', color: 'var(--meow-orange-deep)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    ฿{meowCarePrice.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#999', textDecoration: 'line-through', fontWeight: 'normal' }}>฿3,500</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={addMeowCare} 
                  onChange={() => setAddMeowCare(!addMeowCare)} 
                  style={{ width: '22px', height: '22px', marginTop: '4px', accentColor: 'var(--meow-orange-deep)' }} 
                />
              </label>
            </div>
          </>
        )}

        {/* Delivery Method */}
        {itemType !== 'clinic' && (
          <>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>🚚 วิธีการรับสินค้า</h3>
            <div className="meow-card" style={{ padding: '0', marginBottom: '20px', overflow: 'hidden' }}>
              <label style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', background: deliveryMethod === 'pickup' ? '#f8f9fa' : '#fff' }}>
                <input type="radio" name="delivery" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} style={{ marginRight: '12px', width: '20px', height: '20px' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block' }}>🤝 นัดรับด้วยตัวเอง</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ฟรี! นัดพบกับผู้ขายโดยตรง</span>
                </div>
                <span style={{ fontWeight: 'bold', color: '#28a745' }}>ฟรี</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', background: deliveryMethod === 'shipping' ? '#f8f9fa' : '#fff' }}>
                <input type="radio" name="delivery" checked={deliveryMethod === 'shipping'} onChange={() => setDeliveryMethod('shipping')} style={{ marginRight: '12px', width: '20px', height: '20px' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block' }}>📦 จัดส่งถึงบ้าน</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--meow-muted)' }}>จัดส่ง Kerry/Flash Express 1-3 วัน</span>
                </div>
                <span style={{ fontWeight: 'bold', color: 'var(--meow-orange-deep)' }}>฿150</span>
              </label>
            </div>
          </>
        )}

        {/* Trust Badge (Escrow System) */}
        <div style={{ background: '#f8fdfa', border: '1px solid #d4edda', borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <div>
            <strong style={{ display: 'block', color: '#155724', fontSize: '0.9rem', marginBottom: '2px' }}>MeowMatch Guarantee</strong>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#28a745', lineHeight: 1.4 }}>
              เงินของคุณจะถูกเก็บรักษาอย่างปลอดภัย และจะโอนให้ผู้ขายต่อเมื่อคุณ <strong>"ยืนยันการรับแมว/เข้าพัก"</strong> แล้วเท่านั้น
            </p>
          </div>
        </div>

        {/* Discount Code */}
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>🎟️ โค้ดส่วนลด</h3>
        <div className="meow-card" style={{ padding: '16px', marginBottom: '20px' }}>
          {!discountApplied ? (
            <div>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <input 
                  className="meow-input" 
                  style={{ flex: 1, minWidth: 0, margin: 0, padding: '12px 16px' }} 
                  placeholder="ใส่โค้ดส่วนลด (เช่น MEOW50)" 
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value)}
                />
                <button className="meow-btn meow-btn-outline" style={{ flexShrink: 0, width: 'auto', padding: '0 20px', borderRadius: '12px', whiteSpace: 'nowrap' }} onClick={applyDiscount}>
                  ใช้โค้ด
                </button>
              </div>
              {discountError && <p style={{ margin: '8px 0 0', color: '#dc3545', fontSize: '0.85rem' }}>{discountError}</p>}
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--meow-muted)' }}>*ลองพิมพ์ "CATLOVER" เพื่อรับส่วนลด 10%</p>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d4edda', padding: '12px', borderRadius: '12px' }}>
              <div>
                <strong style={{ color: '#28a745', display: 'block' }}>ใช้งานโค้ด {discountCode.toUpperCase()} แล้ว</strong>
                <span style={{ fontSize: '0.85rem', color: '#155724' }}>ลดไป ฿{discountValue.toLocaleString()}</span>
              </div>
              <button onClick={removeDiscount} style={{ background: 'none', border: 'none', color: '#dc3545', fontWeight: 'bold', cursor: 'pointer' }}>นำออก</button>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>💳 ช่องทางชำระเงิน</h3>
        <div className="meow-card" style={{ padding: '0', marginBottom: '20px', overflow: 'hidden' }}>
          
          <label style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', background: paymentMethod === 'promptpay' ? '#f8f9fa' : '#fff' }}>
            <input type="radio" name="payment" checked={paymentMethod === 'promptpay'} onChange={() => setPaymentMethod('promptpay')} style={{ marginRight: '12px', width: '20px', height: '20px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block' }}>สแกน PromptPay / QR Code</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--meow-muted)' }}>รองรับทุกธนาคาร ฟรีค่าธรรมเนียม</span>
            </div>
            <span style={{ fontSize: '1.5rem' }}>📱</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', background: paymentMethod === 'credit' ? '#f8f9fa' : '#fff' }}>
            <input type="radio" name="payment" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} style={{ marginRight: '12px', width: '20px', height: '20px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block' }}>บัตรเครดิต / เดบิต</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--meow-muted)' }}>Visa, Mastercard, JCB</span>
            </div>
            <span style={{ fontSize: '1.5rem' }}>💳</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', background: paymentMethod === 'truemoney' ? '#f8f9fa' : '#fff' }}>
            <input type="radio" name="payment" checked={paymentMethod === 'truemoney'} onChange={() => setPaymentMethod('truemoney')} style={{ marginRight: '12px', width: '20px', height: '20px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block' }}>TrueMoney Wallet</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ตัดเงินผ่านแอป TrueMoney</span>
            </div>
            <span style={{ fontSize: '1.5rem' }}>🧡</span>
          </label>
        </div>

        {paymentError && (
          <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '12px', background: 'var(--meow-danger-soft)', color: 'var(--meow-danger)', fontSize: '0.88rem', fontWeight: 700 }}>
            {paymentError}
          </div>
        )}

      </div>

      {/* Fixed Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTop: '1px solid #f0eaf8',
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        zIndex: 90,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.07)'
      }}>
        <button
          onClick={handlePayment}
          disabled={isProcessing || basePrice === 0}
          style={{
            width: '100%',
            padding: '16px 0',
            borderRadius: '16px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            background: 'linear-gradient(135deg, var(--meow-purple), var(--meow-purple-deep))',
            color: '#fff',
            cursor: (isProcessing || basePrice === 0) ? 'not-allowed' : 'pointer',
            opacity: (isProcessing || basePrice === 0) ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(181, 123, 238, 0.4)'
          }}
        >
          {isProcessing ? '⏳ กำลังดำเนินการ...' : `ชำระเงิน ฿${finalPrice.toLocaleString()}`}
        </button>
      </div>
    </MobileShell>
  )
}
