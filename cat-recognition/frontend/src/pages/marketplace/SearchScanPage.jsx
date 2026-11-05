import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'

export default function SearchScanPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewBlob, setPreviewBlob] = useState(null)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    return () => {
      stopCamera()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPreviewBlob(null)
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }).catch(() =>
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
      alert('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์และ HTTPS')
    }
  }

  const captureSnapshot = () => {
    if (!videoRef.current || !isCameraActive) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 853

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
      setPreviewBlob(blob)
      stopCamera()
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

  const handleSearch = async () => {
    if (!previewBlob) return
    setSearching(true)
    try {
      const formData = new FormData()
      formData.append('image', previewBlob, 'search.jpg')

      const res = await fetch('http://localhost:8000/api/search', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      } else {
        const err = await res.json()
        alert(`ค้นหาล้มเหลว: ${err.detail || 'เกิดข้อผิดพลาด'}`)
      }
    } catch {
      alert('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้')
    } finally {
      setSearching(false)
    }
  }

  return (
    <MobileShell title="สแกนใบหน้าของคุณ" onBack={() => navigate('/')}>
      <div style={{ padding: '0 12px 12px' }}>
        <p className="page-intro" style={{ margin: '8px 4px 16px', textAlign: 'center' }}>
          ระบบ AI จะวิเคราะห์โครงหน้าของคุณ หู ตา จมูก เพื่อค้นหาแมวที่หน้าเหมือนคุณที่สุด
        </p>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* Camera Box with buttons inside */}
        <div style={{
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#1a1a1e',
          position: 'relative',
          aspectRatio: '3/4',
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto 16px',
          boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: isCameraActive ? 'block' : 'none' }} />

          {previewUrl && !isCameraActive && (
            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}

          {!isCameraActive && !previewUrl && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }} onClick={startCamera}>
              <span style={{ fontSize: '3rem', marginBottom: '8px' }}>👤</span>
              <p style={{ margin: 0 }}>กดเพื่อเปิดกล้องค้นหา</p>
            </div>
          )}

          {isCameraActive && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '65%', aspectRatio: '1 / 1', pointerEvents: 'none', zIndex: 10, boxSizing: 'border-box' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', borderLeft: '4px solid #ff7a45', borderTop: '4px solid #ff7a45', borderTopLeftRadius: '12px' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '24px', height: '24px', borderRight: '4px solid #ff7a45', borderTop: '4px solid #ff7a45', borderTopRightRadius: '12px' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '24px', height: '24px', borderLeft: '4px solid #ff7a45', borderBottom: '4px solid #ff7a45', borderBottomLeftRadius: '12px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderRight: '4px solid #ff7a45', borderBottom: '4px solid #ff7a45', borderBottomRightRadius: '12px' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', backgroundColor: '#ff7a45', borderRadius: '50%', boxShadow: '0 0 8px #ff7a45' }} />
            </div>
          )}

          {/* Buttons INSIDE the frame */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', gap: '10px', zIndex: 20 }}>
            {!isCameraActive ? (
              <>
                <button type="button" onClick={startCamera} style={{ flex: 1, padding: '12px', borderRadius: '16px', border: 'none', background: 'rgba(255,255,255,0.9)', color: '#333', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>🎥 เปิดกล้อง</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '12px', borderRadius: '16px', border: 'none', background: 'rgba(255,255,255,0.9)', color: '#333', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>📁 เลือกรูป</button>
              </>
            ) : (
              <>
                <button type="button" onClick={captureSnapshot} style={{ flex: 2, padding: '14px', borderRadius: '16px', border: 'none', background: '#ff7a45', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,122,69,0.4)' }}>📸 จับภาพ</button>
                <button type="button" onClick={stopCamera} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: 'rgba(255,255,255,0.85)', color: '#dc3545', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>✕ ปิด</button>
              </>
            )}
          </div>
        </div>

        {/* Search Button */}
        <button
          className="meow-btn meow-btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
          disabled={!previewBlob || searching}
          onClick={handleSearch}
        >
          {searching ? '⏳ กำลังค้นหาใบหน้าด้วย AI...' : '🔍 ค้นหาแมวที่เหมือนรูปนี้'}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>🎉 พบ {results.length} แมวที่หน้าคล้ายกัน</h3>
            <div className="cat-grid">
              {results.map((cat) => (
                <div key={cat.id} className="cat-card" onClick={() => navigate(`/cat/${cat.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="cat-image-wrapper">
                    {cat.image_url ? (
                      <img src={`http://localhost:8000${cat.image_url}`} alt={cat.name} className="cat-image" />
                    ) : (
                      <div className="cat-image-placeholder">🐱</div>
                    )}
                    <div className="cat-price-badge" style={{ background: 'var(--meow-purple-soft)', color: 'var(--meow-purple-deep)' }}>
                      Match: {cat.match_confidence}%
                    </div>
                  </div>
                  <div className="cat-info">
                    <h3 className="cat-name">{cat.name}</h3>
                    <p className="cat-breed-color">{cat.breed}</p>
                    <div className="cat-meta">
                      <span>{cat.price > 0 ? `฿${cat.price.toLocaleString()}` : 'ฟรี'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  )
}