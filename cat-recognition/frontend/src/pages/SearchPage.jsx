import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import '../styles/SearchPage.css'

function getErrorMessage(err) {
  const data = err.response?.data
  if (!data) {
    return err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'
  }
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    return data.detail.map((d) => d.msg || d.message || String(d)).join(', ')
  }
  if (data.message) return data.message
  return 'เกิดข้อผิดพลาดในการค้นหา'
}

function normalizeConfidence(value) {
  if (value == null || Number.isNaN(Number(value))) return 0
  let n = Number(value)
  if (n > 0 && n <= 1) n *= 100
  return Math.round(Math.min(100, Math.max(0, n)))
}

function getConfidenceLevel(percent) {
  if (percent > 80) return 'high'
  if (percent >= 50) return 'medium'
  return 'low'
}

function resolveImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

function parseResults(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.matches)) return data.matches
  return []
}

export default function SearchPage() {
  const fileInputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('error')
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error')
      setErrorMessage('ขนาดรูปต้องไม่เกิน 10 MB')
      return
    }
    setImageFile(file)
    setResults([])
    if (status !== 'idle') {
      setStatus('idle')
      setErrorMessage('')
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setResults([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!imageFile) {
      setStatus('error')
      setErrorMessage('กรุณาอัปโหลดรูปแมวก่อนค้นหา')
      return
    }

    const formData = new FormData()
    formData.append('image', imageFile)

    setStatus('loading')
    setErrorMessage('')
    setResults([])

    try {
      const { data } = await axios.post('/api/search', formData)
      const items = parseResults(data).slice(0, 5)
      if (items.length === 0) {
        setStatus('empty')
      } else {
        setResults(items)
        setStatus('done')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(getErrorMessage(err))
    }
  }

  const resetSearch = () => {
    clearImage()
    setStatus('idle')
    setErrorMessage('')
    setResults([])
  }

  return (
    <div className="page search-page">
      <div className="search-card">
        <div className="search-header">
          <span className="emoji-medium" aria-hidden="true">
            🔍
          </span>
          <h1>ค้นหาแมว</h1>
          <p className="subtitle">
            อัปโหลดรูปแมวเพื่อค้นหาแมวที่ลงทะเบียนไว้ในระบบ (แสดงผลลัพธ์สูงสุด 5 รายการ)
          </p>
        </div>

        <form className="search-form" onSubmit={handleSearch} noValidate>
          <section className="form-section">
            <h2>
              <span aria-hidden="true">📷</span> รูปแมวที่ต้องการค้นหา
            </h2>
            <div
              className={`upload-zone ${previewUrl ? 'has-preview' : ''}`}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="เลือกรูปแมว"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="upload-input"
                aria-hidden="true"
              />
              {previewUrl ? (
                <div className="preview-wrap">
                  <img src={previewUrl} alt="รูปที่ใช้ค้นหา" className="preview-img" />
                  <div className="preview-actions">
                    <button
                      type="button"
                      className="btn-text"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                    >
                      เปลี่ยนรูป
                    </button>
                    <button
                      type="button"
                      className="btn-text btn-text-danger"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        clearImage()
                      }}
                    >
                      ลบรูป
                    </button>
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon" aria-hidden="true">
                    🐱
                  </span>
                  <p>คลิกเพื่อเลือกรูปแมว</p>
                  <span className="upload-hint">JPG, PNG, WEBP — สูงสุด 10 MB</span>
                </div>
              )}
            </div>
          </section>

          {status === 'error' && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon" aria-hidden="true">
                ⚠️
              </span>
              <p>{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <span className="spinner" aria-hidden="true" />
                กำลังค้นหา...
              </>
            ) : (
              <>
                <span aria-hidden="true">🔍</span>
                ค้นหาแมว
              </>
            )}
          </button>
        </form>

        {status === 'loading' && (
          <div className="search-loading" aria-live="polite">
            <span className="spinner spinner-lg" aria-hidden="true" />
            <p>กำลังวิเคราะห์ใบหน้าแมว...</p>
          </div>
        )}

        {status === 'empty' && (
          <div className="empty-state" role="status">
            <span className="empty-icon" aria-hidden="true">
              😿
            </span>
            <p>ไม่พบแมวในระบบ</p>
            <button type="button" className="btn btn-outline" onClick={resetSearch}>
              ลองค้นหาใหม่
            </button>
          </div>
        )}

        {status === 'done' && results.length > 0 && (
          <section className="results-section" aria-label="ผลการค้นหา">
            <h2>
              <span aria-hidden="true">🐱</span> ผลลัพธ์ ({results.length} รายการ)
            </h2>
            <ul className="results-list">
              {results.map((item, index) => {
                const confidence = normalizeConfidence(
                  item.confidence ?? item.score ?? item.similarity,
                )
                const level = getConfidenceLevel(confidence)
                const imageUrl = resolveImageUrl(
                  item.image_url ?? item.image ?? item.photo_url,
                )
                return (
                  <li key={item.cat_id ?? item.id ?? index} className="result-card">
                    <div className="result-rank">#{index + 1}</div>
                    <div className="result-image-wrap">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.cat_name ?? item.name ?? 'รูปแมว'}
                          className="result-image"
                          onError={(ev) => {
                            ev.currentTarget.style.display = 'none'
                            ev.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div
                        className={`result-image-fallback ${imageUrl ? 'hidden' : ''}`}
                        aria-hidden="true"
                      >
                        🐱
                      </div>
                    </div>
                    <div className="result-body">
                      <h3>{item.cat_name ?? item.name ?? 'ไม่ระบุชื่อ'}</h3>
                      <p className="result-meta">
                        <span>พันธุ์:</span>{' '}
                        {item.breed || '—'}
                      </p>
                      <p className="result-meta">
                        <span>เจ้าของ:</span>{' '}
                        {item.owner_name ?? item.owner?.name ?? '—'}
                      </p>
                      <p className="result-meta">
                        <span>เบอร์โทร:</span>{' '}
                        {item.phone ?? item.owner?.phone ?? '—'}
                      </p>
                      <div
                        className={`confidence-badge confidence-${level}`}
                        title="ความมั่นใจในการจับคู่"
                      >
                        <span className="confidence-label">ความตรงกัน</span>
                        <span className="confidence-value">{confidence}%</span>
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <Link to="/" className="btn btn-outline">
          ← กลับหน้าแรก
        </Link>
      </div>
    </div>
  )
}
