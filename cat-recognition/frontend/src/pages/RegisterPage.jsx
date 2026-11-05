import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import '../styles/RegisterPage.css'

const INITIAL_FORM = {
  cat_name: '',
  breed: '',
  color: '',
  age: '',
  owner_name: '',
  phone: '',
  email: '',
}

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
  return 'เกิดข้อผิดพลาดในการลงทะเบียน'
}

export default function RegisterPage() {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (status === 'error') {
      setStatus('idle')
      setMessage('')
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('error')
      setMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error')
      setMessage('ขนาดรูปต้องไม่เกิน 10 MB')
      return
    }
    setImageFile(file)
    if (status === 'error') {
      setStatus('idle')
      setMessage('')
    }
  }

  const clearImage = () => {
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageFile) {
      setStatus('error')
      setMessage('กรุณาอัปโหลดรูปแมว')
      return
    }
    if (!form.cat_name.trim()) {
      setStatus('error')
      setMessage('กรุณากรอกชื่อแมว')
      return
    }
    if (!form.owner_name.trim()) {
      setStatus('error')
      setMessage('กรุณากรอกชื่อเจ้าของ')
      return
    }

    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('cat_name', form.cat_name.trim())
    formData.append('breed', form.breed.trim())
    formData.append('color', form.color.trim())
    if (form.age !== '') formData.append('age', form.age)
    formData.append('owner_name', form.owner_name.trim())
    formData.append('phone', form.phone.trim())
    formData.append('email', form.email.trim())

    setStatus('loading')
    setMessage('')

    try {
      const { data } = await axios.post('/api/register', formData)
      setStatus('success')
      setMessage(
        data?.message ||
          `ลงทะเบียนสำเร็จ! 🐱${data?.cat_id ? ` (รหัสแมว: ${data.cat_id})` : ''}`,
      )
      setForm(INITIAL_FORM)
      clearImage()
    } catch (err) {
      setStatus('error')
      setMessage(getErrorMessage(err))
    }
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    clearImage()
    setStatus('idle')
    setMessage('')
  }

  return (
    <div className="page register-page">
      <div className="register-card">
        <div className="register-header">
          <span className="emoji-medium" aria-hidden="true">
            🐱
          </span>
          <h1>ลงทะเบียนแมว</h1>
          <p className="subtitle">
            อัปโหลดรูปและกรอกข้อมูลเพื่อบันทึกใบหน้าแมวเข้าระบบ
          </p>
        </div>

        {status === 'success' ? (
          <div className="alert alert-success" role="status">
            <span className="alert-icon" aria-hidden="true">
              ✅
            </span>
            <p>{message}</p>
            <button type="button" className="btn btn-primary" onClick={resetForm}>
              ลงทะเบียนแมวตัวอื่น
            </button>
          </div>
        ) : (
          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <section className="form-section">
              <h2>
                <span aria-hidden="true">📷</span> รูปแมว
              </h2>
              <div
                className={`upload-zone ${previewUrl ? 'has-preview' : ''}`}
                onClick={() => !previewUrl && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
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
                    <img src={previewUrl} alt="ตัวอย่างรูปแมว" className="preview-img" />
                    <div className="preview-actions">
                      <button
                        type="button"
                        className="btn-text"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                      >
                        เปลี่ยนรูป
                      </button>
                      <button
                        type="button"
                        className="btn-text btn-text-danger"
                        onClick={(e) => {
                          e.stopPropagation()
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

            <section className="form-section">
              <h2>
                <span aria-hidden="true">🐾</span> ข้อมูลแมว
              </h2>
              <div className="form-grid">
                <label className="form-field form-field-full">
                  <span>
                    ชื่อแมว <em>*</em>
                  </span>
                  <input
                    type="text"
                    name="cat_name"
                    value={form.cat_name}
                    onChange={handleChange}
                    placeholder="เช่น มิว, โมจิ"
                    disabled={status === 'loading'}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>พันธุ์</span>
                  <input
                    type="text"
                    name="breed"
                    value={form.breed}
                    onChange={handleChange}
                    placeholder="เช่น สก็อตติช โฟลด์"
                    disabled={status === 'loading'}
                  />
                </label>
                <label className="form-field">
                  <span>สี</span>
                  <input
                    type="text"
                    name="color"
                    value={form.color}
                    onChange={handleChange}
                    placeholder="เช่น ส้มขาว"
                    disabled={status === 'loading'}
                  />
                </label>
                <label className="form-field">
                  <span>อายุ (ปี)</span>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    placeholder="เช่น 2"
                    min="0"
                    max="30"
                    disabled={status === 'loading'}
                  />
                </label>
              </div>
            </section>

            <section className="form-section">
              <h2>
                <span aria-hidden="true">👤</span> ข้อมูลเจ้าของ
              </h2>
              <div className="form-grid">
                <label className="form-field form-field-full">
                  <span>
                    ชื่อเจ้าของ <em>*</em>
                  </span>
                  <input
                    type="text"
                    name="owner_name"
                    value={form.owner_name}
                    onChange={handleChange}
                    placeholder="ชื่อ-นามสกุล"
                    disabled={status === 'loading'}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>เบอร์โทร</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="08x-xxx-xxxx"
                    disabled={status === 'loading'}
                  />
                </label>
                <label className="form-field">
                  <span>อีเมล</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@email.com"
                    disabled={status === 'loading'}
                  />
                </label>
              </div>
            </section>

            {status === 'error' && (
              <div className="alert alert-error" role="alert">
                <span className="alert-icon" aria-hidden="true">
                  ⚠️
                </span>
                <p>{message}</p>
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
                  กำลังลงทะเบียน...
                </>
              ) : (
                <>
                  <span aria-hidden="true">📝</span>
                  ลงทะเบียน
                </>
              )}
            </button>
          </form>
        )}

        <Link to="/" className="btn btn-outline">
          ← กลับหน้าแรก
        </Link>
      </div>
    </div>
  )
}
