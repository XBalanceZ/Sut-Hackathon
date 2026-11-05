import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'

export default function CreateListingPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewBlob, setPreviewBlob] = useState(null)
  const [saving, setSaving] = useState(false)

  const routerLocation = useLocation()

  // Form State
  const [category] = useState(routerLocation.state?.category || 'cat')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [color, setColor] = useState('')
  const [gender, setGender] = useState('unknown')
  const [age, setAge] = useState('young')
  const [weight, setWeight] = useState('')
  const [price, setPrice] = useState('')
  const [locationName, setLocationName] = useState('')
  const [desc, setDesc] = useState('')
  const [vaccine, setVaccine] = useState('ยังไม่เคยได้รับวัคซีน')

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCamera = async () => {
    try {
      stopCamera()
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPreviewBlob(null)
      }

      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }))

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(console.error)
      }
    } catch {
      alert('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึง')
    }
  }

  const captureSnapshot = () => {
    if (!videoRef.current || !isCameraActive) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(URL.createObjectURL(blob))
        setPreviewBlob(blob)
        stopCamera()
      },
      'image/jpeg',
      0.9
    )
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopCamera()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setPreviewBlob(file)
  }

  const handleSaveListing = async () => {
    if (!name.trim()) return alert(category === 'clinic' ? 'กรุณากรอกชื่อคอร์สคลินิก' : category === 'cat' ? 'กรุณากรอกชื่อแมว' : 'กรุณากรอกชื่อสินค้า')

    if (category === 'clinic') {
      const newClinicCourse = {
        id: `local-clinic-${Date.now()}`,
        name: name.trim(),
        clinicName: locationName.trim() || 'คลินิกของฉัน',
        distance: 'จากร้านของคุณ',
        rating: 5.0,
        reviews: 0,
        price: price ? parseFloat(price) : 0,
        originalPrice: price ? Math.round(parseFloat(price) * 1.35) : 0,
        tags: ['🏥 คอร์สคลินิก', '🩺 ตรวจสุขภาพ'],
        duration: 'ตามรายละเอียดคอร์ส',
        validity: 'ใช้สิทธิ์ได้ภายใน 90 วันหลังชำระเงิน',
        included: desc.trim()
          ? desc.trim().split('\n').filter(Boolean)
          : ['รายละเอียดบริการตามที่คลินิกกำหนด'],
        preparation: ['ติดต่อคลินิกเพื่อนัดหมายล่วงหน้าก่อนเข้ารับบริการ'],
        process: ['แสดงรายการสั่งซื้อกับพนักงานหน้าเคาน์เตอร์', 'เข้ารับบริการตามโปรแกรมที่ซื้อ'],
        terms: ['ราคานี้ไม่รวมค่ายาหรือบริการเพิ่มเติมนอกแพ็กเกจ', 'ไม่สามารถแลกเป็นเงินสดได้'],
      }

      const savedCourses = JSON.parse(localStorage.getItem('clinicCourses') || '[]')
      localStorage.setItem('clinicCourses', JSON.stringify([newClinicCourse, ...savedCourses]))
      navigate('/clinics')
      return
    }

    if (!previewBlob) return alert('กรุณาถ่ายรูปหรืออัปโหลดรูป')

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('image', previewBlob, `item_${Date.now()}.jpg`)
      formData.append('name', name.trim())
      formData.append('price', price ? parseFloat(price) : 0)
      formData.append('location_name', locationName.trim())
      formData.append('description', desc.trim())
      formData.append('category', category)

      if (category === 'cat') {
        formData.append('breed', breed.trim())
        formData.append('color', color.trim())
        formData.append('gender', gender)
        formData.append('estimated_age', age)
        formData.append('vaccine_status', vaccine.trim())
        formData.append('weight', weight ? parseFloat(weight) : 0)
      }

      let token = localStorage.getItem('access_token')
      if (!token) {
        const loginData = new FormData()
        loginData.append('email', 'demo@meowmatch.com')
        loginData.append('password', 'password123')
        loginData.append('name', 'Demo Seller')
        loginData.append('phone', '0812345678')

        const loginRes = await fetch('http://localhost:8000/api/auth/register', { method: 'POST', body: loginData })
        if (loginRes.ok) {
          const lData = await loginRes.json()
          token = lData.access_token
          localStorage.setItem('access_token', token)
        } else {
          const loginRes2 = await fetch('http://localhost:8000/api/auth/login', { method: 'POST', body: loginData })
          const lData2 = await loginRes2.json()
          token = lData2.access_token
          localStorage.setItem('access_token', token)
        }
      }

      const res = await fetch('http://localhost:8000/api/cats', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        alert(`🎉 ลงขายสำเร็จ!`)
        navigate(`/cat/${data.cat_id}`)
      } else {
        const err = await res.json()
        alert(`บันทึกล้มเหลว: ${err.detail}`)
      }
    } catch {
      alert('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้')
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileShell title={category === 'cat' ? 'ลงขายแมว' : category === 'clinic' ? 'เพิ่มคอร์สคลินิก' : 'เพิ่มสินค้า'} onBack={() => navigate('/sell-dashboard')}>
      <div style={{ padding: '16px 12px 120px' }}>

        {category !== 'clinic' && (
          <>
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />

            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#1a1a1e',
              position: 'relative',
              aspectRatio: '4/3',
              width: '100%',
              maxWidth: '420px',
              margin: '12px auto 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: isCameraActive ? 'block' : 'none' }}
              />

              {previewUrl && !isCameraActive && (
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}

              {!isCameraActive && !previewUrl && (
                <div
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
                  onClick={startCamera}
                >
                  <span style={{ fontSize: '2.5rem', marginBottom: '4px' }}>📸</span>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>กดเพื่อเปิดกล้องถ่ายรูป</p>
                </div>
              )}

              {isCameraActive && (
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '50%',
                  aspectRatio: '1 / 1',
                  pointerEvents: 'none',
                  zIndex: 10,
                  boxSizing: 'border-box',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderLeft: '3px solid rgba(255,122,69,0.8)', borderTop: '3px solid rgba(255,122,69,0.8)', borderTopLeftRadius: '8px' }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderRight: '3px solid rgba(255,122,69,0.8)', borderTop: '3px solid rgba(255,122,69,0.8)', borderTopRightRadius: '8px' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '16px', height: '16px', borderLeft: '3px solid rgba(255,122,69,0.8)', borderBottom: '3px solid rgba(255,122,69,0.8)', borderBottomLeftRadius: '8px' }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderRight: '3px solid rgba(255,122,69,0.8)', borderBottom: '3px solid rgba(255,122,69,0.8)', borderBottomRightRadius: '8px' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '420px', margin: '0 auto 20px' }}>
              {!isCameraActive ? (
                <>
                  <button type="button" onClick={startCamera} className="meow-btn meow-btn-outline" style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}>
                    🎥 เปิดกล้อง
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="meow-btn meow-btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}>
                    📁 เลือกรูปจากเครื่อง
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={captureSnapshot} className="meow-btn meow-btn-primary" style={{ flex: 2, padding: '12px', fontSize: '0.95rem' }}>
                    📸 ถ่ายภาพคอนเฟิร์ม
                  </button>
                  <button type="button" onClick={stopCamera} className="meow-btn meow-btn-danger" style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}>
                    ✕ ปิดกล้อง
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Form Fields */}
        <div className="meow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label className="meow-label">
              {category === 'clinic' ? 'ชื่อคอร์สคลินิก' : 'ชื่อสินค้า/แมว'} <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              className="meow-input"
              placeholder={category === 'cat' ? 'เช่น น้องส้ม' : category === 'clinic' ? 'เช่น คอร์สตรวจสุขภาพประจำปี' : 'เช่น อาหารแมวเกรดพรีเมียม'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {category === 'cat' && (
            <>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="meow-label">สายพันธุ์</label>
                  <input className="meow-input" placeholder="เช่น เปอร์เซีย" value={breed} onChange={(e) => setBreed(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="meow-label">สี</label>
                  <input className="meow-input" placeholder="เช่น ส้มขาว" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="meow-label">เพศ</label>
                  <select className="meow-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="unknown">ไม่ระบุ</option>
                    <option value="male">ตัวผู้ ♂️</option>
                    <option value="female">ตัวเมีย ♀️</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="meow-label">ช่วงอายุ</label>
                  <select className="meow-input" value={age} onChange={(e) => setAge(e.target.value)}>
                    <option value="kitten">ลูกแมว</option>
                    <option value="young">วัยรุ่น</option>
                    <option value="adult">โตเต็มวัย</option>
                    <option value="senior">สูงอายุ</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="meow-label">น้ำหนัก (กก.)</label>
                  <input
                    className="meow-input"
                    type="number"
                    step="0.1"
                    placeholder="เช่น 4.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <div>
                  <label className="meow-label">🛡️ สถานะวัคซีนแมว</label>
                  <select
                    className="meow-input"
                    value={vaccine.split(' | ')[0]}
                    onChange={(e) => {
                      const nextDate = vaccine.split(' | ')[1] || ''
                      setVaccine(nextDate ? `${e.target.value} | ${nextDate}` : e.target.value)
                    }}
                  >
                    <option value="ยังไม่เคยได้รับวัคซีน">❌ ยังไม่มีการฉีดวัคซีน (รอเริ่มโปรแกรม)</option>
                    <option value="ได้รับวัคซีนแรกเกิดแล้ว (ไข้หัด/หวัดแมวเข็มแรก)">👶 แรกเกิดครบแล้ว (ไข้หัด/หวัดแมว เข็ม 1)</option>
                    <option value="วัคซีนหลักครบถ้วนแล้ว (ไข้หัด + พิษสุนัขบ้า)">✅ วัคซีนหลักครบถ้วน (พร้อมย้ายบ้าน)</option>
                    <option value="ฉีดวัคซีนครบถ้วน + กระตุ้นประจำปีแล้ว">🔄 วัคซีนครบ + กระตุ้นประจำปีแล้ว</option>
                  </select>
                </div>

                {vaccine && !vaccine.startsWith('ยังไม่เคยได้รับวัคซีน') && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f5f5f7', padding: '12px', borderRadius: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label className="meow-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                        📅 วันนัดกระตุ้นเข็มถัดไป (ถ้ามี)
                      </label>
                      <input
                        type="date"
                        className="meow-input"
                        style={{ padding: '8px', fontSize: '0.9rem' }}
                        value={vaccine.split(' | ')[1] || ''}
                        onChange={(e) => {
                          const status = vaccine.split(' | ')[0]
                          setVaccine(e.target.value ? `${status} | ${e.target.value}` : status)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <label className="meow-label">ราคา (บาท)</label>
            <input
              className="meow-input"
              type="number"
              placeholder="เช่น 1500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div>
            <label className="meow-label">{category === 'clinic' ? 'ชื่อคลินิก/สถานที่ให้บริการ' : 'สถานที่นัดรับ'}</label>
            <input
              className="meow-input"
              placeholder="เช่น กรุงเทพฯ เขตปทุมวัน"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div>
            <label className="meow-label">{category === 'clinic' ? 'รายละเอียดโปรแกรม (แยกบรรทัดได้)' : 'รายละเอียดเพิ่มเติม'}</label>
            <textarea
              className="meow-input"
              placeholder={category === 'clinic' ? 'เช่น ตรวจร่างกายทั่วไป\nตรวจเลือด CBC\nรับคำแนะนำจากสัตวแพทย์' : 'นิสัยน้อง อาหารที่ชอบ...'}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Fixed Bottom Action Button */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'var(--meow-white)', borderTop: '1px solid var(--meow-border)', zIndex: 10 }}>
          <button
            type="button"
            className="meow-btn meow-btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
            onClick={handleSaveListing}
            disabled={saving}
          >
            {saving ? '⏳ กำลังบันทึก...' : category === 'clinic' ? '🏥 เพิ่มคอร์สคลินิก' : '💰 โพสต์ลงขาย'}
          </button>
        </div>

      </div>
    </MobileShell>
  )
}
