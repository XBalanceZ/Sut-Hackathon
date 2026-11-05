import { useEffect, useRef, useState } from 'react'
import { MobileShell } from '../../components/layout/MobileShell'
import OwnerNav from '../../components/layout/OwnerNav'
import CameraFaceOverlay, { ANGLES } from '../../components/CameraFaceOverlay'
import './owner-pages.css'

const API = 'http://localhost:8000'

const VACCINES = [
  { name: 'ป้องกันพิษสุนัขบ้า', date: '12 ม.ค. 2568', next: '12 ม.ค. 2569', status: 'ครบ' },
  { name: 'ป้องกันทูเมอร์', date: '5 ก.ย. 2567', next: '5 ก.ย. 2568', status: 'ใกล้ครบ' },
  { name: 'ถ่ายพยาธิ', date: '1 มิ.ย. 2567', next: '1 ธ.ค. 2567', status: 'ครบ' },
]

export default function OwnerRegisterPage() {
  const [tab, setTab] = useState('scan')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewBlob, setPreviewBlob] = useState(null) // ✅ เก็บ blob ที่จะส่ง API
  const [capturedAngles, setCapturedAngles] = useState([])
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)

  const [catName, setCatName] = useState('')
  const [catBreed, setCatBreed] = useState('')

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Cleanup: ปิดกล้องและ Object URL เมื่อออกจากหน้า
  useEffect(() => {
    return () => {
      stopCamera()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ปิดกล้องเมื่อสลับแท็บ
  useEffect(() => {
    if (tab !== 'scan') stopCamera()
  }, [tab])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraActive(false)
  }

  const startCamera = async () => {
    try {
      stopCamera()
      // ล้างรูปที่เลือกไว้ก่อนหน้า
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPreviewBlob(null)
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      }).catch(() =>
        // fallback: any camera
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      )

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.error)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      alert('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์กล้องหรือใช้ HTTPS/localhost')
    }
  }

  // 📸 จับภาพจากกล้องสด → แสดง Preview + เก็บ Blob
  const captureSnapshot = () => {
    if (!videoRef.current || !isCameraActive) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 640
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
      setPreviewBlob(blob)
      stopCamera() // ปิดกล้องหลังถ่าย
    }, 'image/jpeg', 0.9)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopCamera()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setPreviewBlob(file)
  }

  const captureAngle = (id) => {
    if (capturedAngles.includes(id)) return
    setScanning(true)
    setTimeout(() => {
      setCapturedAngles((prev) => [...prev, id])
      setScanning(false)
    }, 600)
  }

  const captureAll = () => {
    setScanning(true)
    setTimeout(() => {
      setCapturedAngles(ANGLES.map((a) => a.id))
      setScanning(false)
    }, 1200)
  }

  const handleSaveProfile = async () => {
    if (!catName.trim()) {
      alert('กรุณากรอกชื่อน้องแมวก่อนทำการบันทึกข้อมูลครับ 🐱')
      return
    }
    if (!previewBlob) {
      alert('กรุณาถ่ายรูปหรืออัปโหลดไฟล์รูปภาพใบหน้าแมวก่อนบันทึกครับ')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('cat_name', catName.trim())
      formData.append('breed', catBreed.trim() || 'ไม่ระบุสายพันธุ์')
      formData.append('features', 'บันทึกผ่านระบบยืนยันสแกนใบหน้าสำเร็จ')
      formData.append('passport_status', 'Free')
      formData.append('image', previewBlob, `cat_${Date.now()}.jpg`)

      const res = await fetch(`${API}/api/owner/register-cat-dev`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        alert(`🎉 บันทึกสำเร็จ!\nPet ID: ${data.pet_id}`)
        setCatName('')
        setCatBreed('')
        setCapturedAngles([])
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPreviewBlob(null)
      } else {
        const err = await res.json()
        alert(`บันทึกล้มเหลว: ${err.detail || 'เซิร์ฟเวอร์ปฏิเสธ'}`)
      }
    } catch {
      alert('ไม่สามารถติดต่อ MEOW MATCH API กรุณาเช็กว่า Backend รันอยู่ที่ port 8000')
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileShell title="ลงทะเบียนใบหน้า" badge="Owner" footer={<OwnerNav />}>
      <div className="meow-tabs">
        <button
          type="button"
          className={`meow-tab${tab === 'scan' ? ' active' : ''}`}
          onClick={() => setTab('scan')}
        >
          📸 สแกนใบหน้า
        </button>
        <button
          type="button"
          className={`meow-tab${tab === 'passport' ? ' active' : ''}`}
          onClick={() => setTab('passport')}
        >
          🛂 พาสปอร์ตดิจิทัล
        </button>
      </div>

      {tab === 'scan' ? (
        <>
          <p className="page-intro">
            จัดหน้าแมวให้อยู่ในกรอบ ระบบ YOLOv5-Face จะล็อกหู ตา จมูกอัตโนมัติ
          </p>

          {/* Hidden file input — NO capture attribute so user can pick from gallery */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          {/* Camera controls */}
          <div className="camera-control-wrapper">
            {!isCameraActive ? (
              <button type="button" className="meow-btn meow-btn-outline" onClick={startCamera}>
                🎥 เปิดกล้องสด
              </button>
            ) : (
              <>
                <button type="button" className="meow-btn meow-btn-primary" onClick={captureSnapshot}>
                  📸 ถ่ายภาพ
                </button>
                <button type="button" className="meow-btn meow-btn-danger" onClick={stopCamera}>
                  🛑 ปิดกล้อง
                </button>
              </>
            )}
            {!isCameraActive && (
              <button type="button" className="meow-btn meow-btn-secondary" onClick={() => fileInputRef.current?.click()}>
                📁 เลือกรูป
              </button>
            )}
          </div>

          {/* Camera / Preview box */}
          <div className="camera-container-box">
            <CameraFaceOverlay
              capturedAngles={capturedAngles}
              onCaptureAngle={captureAngle}
              scanning={scanning}
            >
              {/* Live camera stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="live-media-content"
                style={{ display: isCameraActive ? 'block' : 'none' }}
              />

              {/* Snapshot / uploaded preview */}
              {previewUrl && !isCameraActive && (
                <img src={previewUrl} alt="Preview" className="live-media-content" />
              )}

              {/* Placeholder */}
              {!isCameraActive && !previewUrl && (
                <div className="camera-placeholder" onClick={startCamera} style={{ cursor: 'pointer' }}>
                  <span className="placeholder-icon">🐱</span>
                  <p>แตะเพื่อเปิดกล้อง</p>
                </div>
              )}

              {/* Camera aiming frame */}
              {isCameraActive && (
                <div className="register-face-frame">
                  <div className="corner top-left" />
                  <div className="corner top-right" />
                  <div className="corner bottom-left" />
                  <div className="corner bottom-right" />
                </div>
              )}
            </CameraFaceOverlay>
          </div>

          {/* Preview status */}
          {previewUrl && (
            <div className="meow-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
              <span>✅</span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.9rem' }}>รูปภาพพร้อมแล้ว</strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--meow-muted)' }}>กรอกชื่อแมวแล้วกดบันทึก</p>
              </div>
              <button
                type="button"
                className="finder-logout-btn"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl)
                  setPreviewUrl(null)
                  setPreviewBlob(null)
                }}
              >
                ล้าง
              </button>
            </div>
          )}

          {/* Form */}
          <div className="meow-card">
            <label className="meow-label">ชื่อแมว</label>
            <input
              className="meow-input"
              placeholder="เช่น น้องส้ม"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
            <label className="meow-label" style={{ marginTop: 12 }}>พันธุ์</label>
            <input
              className="meow-input"
              placeholder="เช่น ส้มขาว"
              value={catBreed}
              onChange={(e) => setCatBreed(e.target.value)}
            />
          </div>

          <div className="sticky-actions">
            <button type="button" className="meow-btn meow-btn-outline" onClick={captureAll}>
              ✅ ถ่ายครบ 8 มุมอัตโนมัติ
            </button>
            <button
              type="button"
              className="meow-btn meow-btn-primary"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? <><span className="spinner-inline" /> กำลังบันทึก...</> : '💾 บันทึกโปรไฟล์ใบหน้า'}
            </button>
          </div>
        </>
      ) : (
        <div className="passport-panel">
          <div className="passport-header">
            <span className="passport-stamp">Premium 🐱</span>
            <h2>Digital Pet Passport</h2>
            <p>{catName || 'น้องส้ม'} · {catBreed || 'ส้มขาว'} · 2 ปี</p>
          </div>
          <ul className="vaccine-list">
            {VACCINES.map((v) => (
              <li key={v.name} className="vaccine-item">
                <div>
                  <strong>{v.name}</strong>
                  <span className="vaccine-date">ฉีด: {v.date}</span>
                </div>
                <span className={`vaccine-status status-${v.status === 'ครบ' ? 'ok' : 'warn'}`}>
                  {v.status}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="meow-btn meow-btn-primary">
            + เพิ่มบันทึกวัคซีน
          </button>
        </div>
      )}
    </MobileShell>
  )
}