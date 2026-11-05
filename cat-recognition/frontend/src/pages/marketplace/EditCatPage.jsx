import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css'

export default function EditCatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [loading, setLoading] = useState(true)
  const [newImageBlob, setNewImageBlob] = useState(null)
  const [newImagePreview, setNewImagePreview] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    color: '',
    gender: 'unknown',
    price: 0,
    status: 'available',
    description: '',
    image_url: '',
    category: 'cat',
    weight: 0,
    estimated_age: 'young',
    locationName: '',
  })

  useEffect(() => {
    const fetchCat = async () => {
      if (String(id).startsWith('local-clinic-')) {
        const savedClinics = JSON.parse(localStorage.getItem('clinicCourses') || '[]')
        const clinic = savedClinics.find(c => c.id === id)
        if (clinic) {
          setFormData({
            name: clinic.name || '',
            breed: '',
            color: '',
            gender: 'unknown',
            price: clinic.price || 0,
            status: clinic.status || 'available',
            description: clinic.included ? clinic.included.join('\n') : '',
            image_url: clinic.image_url || '',
            category: 'clinic',
            weight: 0,
            estimated_age: 'young',
            locationName: clinic.clinicName || clinic.location || '',
          })
        }
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`http://localhost:8000/api/cats/${id}`)
        if (res.ok) {
          const data = await res.json()
          setFormData({
            name: data.name || '',
            breed: data.breed || '',
            color: data.color || '',
            gender: data.gender || 'unknown',
            price: data.price || 0,
            status: data.status || 'available',
            description: data.description || '',
            image_url: data.image_url || '',
            category: data.category || 'cat',
            weight: data.weight || 0,
            estimated_age: data.estimated_age || 'young',
            locationName: data.location_name || data.location || '',
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCat()
  }, [id])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (newImagePreview) URL.revokeObjectURL(newImagePreview)
    setNewImageBlob(file)
    setNewImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (String(id).startsWith('local-clinic-')) {
      const savedClinics = JSON.parse(localStorage.getItem('clinicCourses') || '[]')
      const index = savedClinics.findIndex(c => c.id === id)
      if (index !== -1) {
        savedClinics[index] = {
          ...savedClinics[index],
          name: formData.name,
          price: formData.price,
          status: formData.status,
          included: formData.description ? formData.description.split('\n') : [],
          clinicName: formData.locationName,
        }
        localStorage.setItem('clinicCourses', JSON.stringify(savedClinics))
        alert('บันทึกข้อมูลคลินิกเรียบร้อยแล้ว')
        navigate('/sell-dashboard')
      }
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const data = new FormData()
      data.append('name', formData.name)
      data.append('breed', formData.breed)
      data.append('color', formData.color)
      data.append('gender', formData.gender)
      data.append('price', formData.price)
      data.append('status', formData.status)
      data.append('description', formData.description)
      data.append('category', formData.category)
      data.append('weight', formData.weight)
      data.append('estimated_age', formData.estimated_age)
      data.append('location_name', formData.locationName)

      if (newImageBlob) {
        data.append('image', newImageBlob, `cat_edit_${Date.now()}.jpg`)
      }

      const res = await fetch(`http://localhost:8000/api/cats/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      })

      if (res.ok) {
        alert('บันทึกข้อมูลเรียบร้อยแล้ว')
        navigate('/sell-dashboard')
      } else {
        const err = await res.json()
        alert('เกิดข้อผิดพลาด: ' + (err.detail || 'ไม่สามารถบันทึกได้'))
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) return;
    
    if (String(id).startsWith('local-clinic-')) {
      const savedClinics = JSON.parse(localStorage.getItem('clinicCourses') || '[]')
      const newClinics = savedClinics.filter(c => c.id !== id)
      localStorage.setItem('clinicCourses', JSON.stringify(newClinics))
      alert('ลบข้อมูลคลินิกเรียบร้อยแล้ว')
      navigate('/sell-dashboard')
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`http://localhost:8000/api/cats/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        alert('ลบข้อมูลเรียบร้อยแล้ว')
        navigate('/sell-dashboard')
      } else {
        const err = await res.json()
        alert('เกิดข้อผิดพลาด: ' + (err.detail || 'ไม่สามารถลบได้'))
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  if (loading) {
    return (
      <MobileShell title="แก้ไขข้อมูลสินค้า" onBack={() => navigate('/sell-dashboard')} noNav>
        <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลด...</div>
      </MobileShell>
    )
  }

  const displayImage = newImagePreview || (formData.image_url ? `http://localhost:8000${formData.image_url}` : null)

  return (
    <MobileShell title="แก้ไขข้อมูลสินค้า" onBack={() => navigate('/sell-dashboard')} noNav>
      <div style={{ padding: '16px', background: '#f8f9fa', minHeight: '100%', paddingBottom: '100px' }}>
        
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

        <div className="meow-card" style={{ padding: '20px' }}>
          
          {/* Image with Edit Overlay */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              marginBottom: '16px', textAlign: 'center', cursor: 'pointer',
              position: 'relative', display: 'inline-block', width: '100%'
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={displayImage || "https://via.placeholder.com/150?text=No+Image"} 
                alt="Cat" 
                style={{ width: '120px', height: '120px', borderRadius: '16px', objectFit: 'cover', border: '3px solid var(--meow-purple-soft)' }} 
              />
              <div style={{
                position: 'absolute', bottom: '-4px', right: '-4px',
                width: '36px', height: '36px', borderRadius: '18px',
                background: 'var(--meow-purple)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', border: '3px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                📷
              </div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--meow-muted)' }}>กดเพื่อเปลี่ยนรูปภาพ</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ชื่อรายการ/หัวข้อ</label>
            <input type="text" name="name" className="meow-input" value={formData.name} onChange={handleChange} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>หมวดหมู่</label>
              <select name="category" className="meow-input" value={formData.category} onChange={handleChange} style={{ width: '100%' }}>
                <option value="cat">แมว</option>
                <option value="food">อาหาร</option>
                <option value="accessory">อุปกรณ์</option>
                <option value="clinic">คอร์สคลินิก</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ราคา (บาท)</label>
              <input type="number" name="price" className="meow-input" value={formData.price} onChange={handleChange} style={{ width: '100%' }} />
            </div>
          </div>

          {formData.category === 'cat' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>สายพันธุ์</label>
                  <input type="text" name="breed" className="meow-input" value={formData.breed} onChange={handleChange} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>สี</label>
                  <input type="text" name="color" className="meow-input" value={formData.color} onChange={handleChange} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>เพศ</label>
                  <select name="gender" className="meow-input" value={formData.gender} onChange={handleChange} style={{ width: '100%' }}>
                    <option value="unknown">ไม่ระบุ</option>
                    <option value="male">ตัวผู้ ♂️</option>
                    <option value="female">ตัวเมีย ♀️</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ช่วงอายุ</label>
                  <select name="estimated_age" className="meow-input" value={formData.estimated_age} onChange={handleChange} style={{ width: '100%' }}>
                    <option value="kitten">ลูกแมว</option>
                    <option value="young">วัยรุ่น</option>
                    <option value="adult">โตเต็มวัย</option>
                    <option value="senior">สูงอายุ</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>น้ำหนัก (กก.)</label>
                <input type="number" name="weight" step="0.1" className="meow-input" value={formData.weight} onChange={handleChange} style={{ width: '100%' }} />
              </div>
            </>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>{formData.category === 'clinic' ? 'ชื่อคลินิก/สถานที่ให้บริการ' : 'สถานที่นัดรับ'}</label>
            <input type="text" name="locationName" className="meow-input" value={formData.locationName} onChange={handleChange} style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>รายละเอียด</label>
            <textarea name="description" className="meow-input" value={formData.description} onChange={handleChange} rows={3} style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>สถานะการขาย</label>
            <select name="status" className="meow-input" value={formData.status} onChange={handleChange} style={{ width: '100%' }}>
              <option value="available">พร้อมขาย</option>
              <option value="sold">ขายแล้ว</option>
            </select>
          </div>

          <button className="meow-btn meow-btn-primary" onClick={handleSave} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', marginBottom: '12px' }}>
            บันทึกการเปลี่ยนแปลง
          </button>
          
          <button className="meow-btn" onClick={handleDelete} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', background: '#fff', color: '#dc3545', border: '1px solid #dc3545' }}>
            ลบรายการนี้
          </button>
        </div>
      </div>
    </MobileShell>
  )
}
